/**
 * Search
 */

const elasticsearch = require('elasticsearch');
const debug = require('debug')('growi:lib:search');
const logger = require('@alias/logger')('growi:lib:search');

const {
  Writable, Transform,
} = require('stream');
const streamToPromise = require('stream-to-promise');

const BULK_REINDEX_SIZE = 100;

function SearchClient(crowi, esUri) {
  this.DEFAULT_OFFSET = 0;
  this.DEFAULT_LIMIT = 50;

  this.esNodeName = '-';
  this.esNodeNames = [];
  this.esVersion = 'unknown';
  this.esVersions = [];
  this.esPlugin = [];
  this.esPlugins = [];
  this.esUri = esUri;
  this.crowi = crowi;
  this.searchEvent = crowi.event('search');
  this.configManager = this.crowi.configManager;

  // In Elasticsearch RegExp, we don't need to used ^ and $.
  // Ref: https://www.elastic.co/guide/en/elasticsearch/reference/5.6/query-dsl-regexp-query.html#_standard_operators
  this.queries = {
    PORTAL: {
      regexp: {
        'path.raw': '.*/',
      },
    },
    PUBLIC: {
      regexp: {
        'path.raw': '.*[^/]',
      },
    },
    USER: {
      prefix: {
        'path.raw': '/user/',
      },
    },
  };

  const uri = this.parseUri(this.esUri);
  this.host = uri.host;
  this.indexName = uri.indexName;
  this.aliasName = `${this.indexName}-alias`;

  this.client = new elasticsearch.Client({
    host: this.host,
    requestTimeout: 5000,
    // log: 'debug',
  });

  this.registerUpdateEvent();

  this.mappingFile = `${crowi.resourceDir}search/mappings.json`;
}

SearchClient.prototype.getInfo = function() {
  return this.client.info({});
};

SearchClient.prototype.checkESVersion = async function() {
  try {
    const nodes = await this.client.nodes.info();
    if (!nodes._nodes || !nodes.nodes) {
      throw new Error('no nodes info');
    }

    for (const [nodeName, nodeInfo] of Object.entries(nodes.nodes)) {
      this.esNodeName = nodeName;
      this.esNodeNames.push(nodeName);
      this.esVersion = nodeInfo.version;
      this.esVersions.push(nodeInfo.version);
      this.esPlugin = nodeInfo.plugins;
      this.esPlugins.push(nodeInfo.plugins);
    }
  }
  catch (error) {
    logger.error('es check version error:', error);
  }
};

SearchClient.prototype.registerUpdateEvent = function() {
  const pageEvent = this.crowi.event('page');
  pageEvent.on('create', this.syncPageUpdated.bind(this));
  pageEvent.on('update', this.syncPageUpdated.bind(this));
  pageEvent.on('delete', this.syncPageDeleted.bind(this));

  const bookmarkEvent = this.crowi.event('bookmark');
  bookmarkEvent.on('create', this.syncBookmarkChanged.bind(this));
  bookmarkEvent.on('delete', this.syncBookmarkChanged.bind(this));

  const tagEvent = this.crowi.event('tag');
  tagEvent.on('update', this.syncTagChanged.bind(this));
};

SearchClient.prototype.shouldIndexed = function(page) {
  return page.creator != null && page.revision != null && page.redirectTo == null;
};

// BONSAI_URL is following format:
// => https://{ID}:{PASSWORD}@{HOST}
SearchClient.prototype.parseUri = function(uri) {
  let indexName = 'crowi';
  let host = uri;
  const match = uri.match(/^(https?:\/\/[^/]+)\/(.+)$/);
  if (match) {
    host = match[1];
    indexName = match[2];
  }

  return {
    host,
    indexName,
  };
};

SearchClient.prototype.initIndices = async function() {
  await this.checkESVersion();

  const { client, indexName, aliasName } = this;

  const tmpIndexName = `${indexName}-tmp`;

  // remove tmp index
  const isExistsTmpIndex = await client.indices.exists({ index: tmpIndexName });
  if (isExistsTmpIndex) {
    await client.indices.delete({ index: tmpIndexName });
  }

  // create index
  const isExistsIndex = await client.indices.exists({ index: indexName });
  if (!isExistsIndex) {
    await this.createIndex(indexName);
  }

  // create alias
  const isExistsAlias = await client.indices.existsAlias({ name: aliasName, index: indexName });
  if (!isExistsAlias) {
    await client.indices.putAlias({
      name: aliasName,
      index: indexName,
    });
  }
};

SearchClient.prototype.createIndex = async function(index) {
  const body = require(this.mappingFile);
  return this.client.indices.create({ index, body });
};

SearchClient.prototype.buildIndex = async function(uri) {
  await this.initIndices();

  const { client, indexName } = this;

  const aliasName = `${indexName}-alias`;
  const tmpIndexName = `${indexName}-tmp`;

  // reindex to tmp index
  await this.createIndex(tmpIndexName);
  await client.reindex({
    waitForCompletion: false,
    body: {
      source: { index: indexName },
      dest: { index: tmpIndexName },
    },
  });

  // update alias
  await client.indices.updateAliases({
    body: {
      actions: [
        { add: { alias: aliasName, index: tmpIndexName } },
        { remove: { alias: aliasName, index: indexName } },
      ],
    },
  });

  // flush index
  await client.indices.delete({
    index: indexName,
  });
  await this.createIndex(indexName);
  await this.addAllPages();

  // update alias
  await client.indices.updateAliases({
    body: {
      actions: [
        { add: { alias: aliasName, index: indexName } },
        { remove: { alias: aliasName, index: tmpIndexName } },
      ],
    },
  });

  // remove tmp index
  await client.indices.delete({ index: tmpIndexName });
};

/**
 * generate object that is related to page.grant*
 */
function generateDocContentsRelatedToRestriction(page) {
  let grantedUserIds = null;
  if (page.grantedUsers != null && page.grantedUsers.length > 0) {
    grantedUserIds = page.grantedUsers.map((user) => {
      const userId = (user._id == null) ? user : user._id;
      return userId.toString();
    });
  }

  let grantedGroupId = null;
  if (page.grantedGroup != null) {
    const groupId = (page.grantedGroup._id == null) ? page.grantedGroup : page.grantedGroup._id;
    grantedGroupId = groupId.toString();
  }

  return {
    grant: page.grant,
    granted_users: grantedUserIds,
    granted_group: grantedGroupId,
  };
}

SearchClient.prototype.prepareBodyForCreate = function(body, page) {
  if (!Array.isArray(body)) {
    throw new Error('Body must be an array.');
  }

  const command = {
    index: {
      _index: this.indexName,
      _type: 'pages',
      _id: page._id.toString(),
    },
  };

  const bookmarkCount = page.bookmarkCount || 0;
  let document = {
    path: page.path,
    body: page.revision.body,
    username: page.creator.username,
    comment_count: page.commentCount,
    bookmark_count: bookmarkCount,
    like_count: page.liker.length || 0,
    created_at: page.createdAt,
    updated_at: page.updatedAt,
    tag_names: page.tagNames,
  };

  document = Object.assign(document, generateDocContentsRelatedToRestriction(page));

  body.push(command);
  body.push(document);
};

SearchClient.prototype.prepareBodyForDelete = function(body, page) {
  if (!Array.isArray(body)) {
    throw new Error('Body must be an array.');
  }

  const command = {
    delete: {
      _index: this.indexName,
      _type: 'pages',
      _id: page._id.toString(),
    },
  };

  body.push(command);
};

SearchClient.prototype.addAllPages = async function() {
  const Page = this.crowi.model('Page');
  return this.updateOrInsertPages(() => Page.find(), true);
};

SearchClient.prototype.updateOrInsertPageById = async function(pageId) {
  const Page = this.crowi.model('Page');
  return this.updateOrInsertPages(() => Page.findById(pageId));
};

/**
 * @param {function} queryFactory factory method to generate a Mongoose Query instance
 */
SearchClient.prototype.updateOrInsertPages = async function(queryFactory, isEmittingProgressEvent = false) {
  const Page = this.crowi.model('Page');
  const { PageQueryBuilder } = Page;
  const Bookmark = this.crowi.model('Bookmark');
  const PageTagRelation = this.crowi.model('PageTagRelation');

  const searchEvent = this.searchEvent;

  const prepareBodyForCreate = this.prepareBodyForCreate.bind(this);
  const shouldIndexed = this.shouldIndexed.bind(this);
  const bulkWrite = this.client.bulk.bind(this.client);

  const findQuery = new PageQueryBuilder(queryFactory()).addConditionToExcludeRedirect().query;
  const countQuery = new PageQueryBuilder(queryFactory()).addConditionToExcludeRedirect().query;

  const totalCount = await countQuery.count();

  const readStream = findQuery
    // populate data which will be referenced by prepareBodyForCreate()
    .populate([
      { path: 'creator', model: 'User', select: 'username' },
      { path: 'revision', model: 'Revision', select: 'body' },
    ])
    .snapshot()
    .lean()
    .cursor();

  let skipped = 0;
  const thinOutStream = new Transform({
    objectMode: true,
    async transform(doc, encoding, callback) {
      if (shouldIndexed(doc)) {
        this.push(doc);
      }
      else {
        skipped++;
      }
      callback();
    },
  });

  let batchBuffer = [];
  const batchingStream = new Transform({
    objectMode: true,
    transform(doc, encoding, callback) {
      batchBuffer.push(doc);

      if (batchBuffer.length >= BULK_REINDEX_SIZE) {
        this.push(batchBuffer);
        batchBuffer = [];
      }

      callback();
    },
    final(callback) {
      if (batchBuffer.length > 0) {
        this.push(batchBuffer);
      }
      callback();
    },
  });

  const appendBookmarkCountStream = new Transform({
    objectMode: true,
    async transform(chunk, encoding, callback) {
      const pageIds = chunk.map(doc => doc._id);

      const idToCountMap = await Bookmark.getPageIdToCountMap(pageIds);
      const idsHavingCount = Object.keys(idToCountMap);

      // append count
      chunk
        .filter(doc => idsHavingCount.includes(doc._id.toString()))
        .forEach((doc) => {
          // append count from idToCountMap
          doc.bookmarkCount = idToCountMap[doc._id.toString()];
        });

      this.push(chunk);
      callback();
    },
  });

  const appendTagNamesStream = new Transform({
    objectMode: true,
    async transform(chunk, encoding, callback) {
      const pageIds = chunk.map(doc => doc._id);

      const idToTagNamesMap = await PageTagRelation.getIdToTagNamesMap(pageIds);
      const idsHavingTagNames = Object.keys(idToTagNamesMap);

      // append tagNames
      chunk
        .filter(doc => idsHavingTagNames.includes(doc._id.toString()))
        .forEach((doc) => {
          // append tagName from idToTagNamesMap
          doc.tagNames = idToTagNamesMap[doc._id.toString()];
        });

      this.push(chunk);
      callback();
    },
  });

  let count = 0;
  const writeStream = new Writable({
    objectMode: true,
    async write(batch, encoding, callback) {
      const body = [];
      batch.forEach(doc => prepareBodyForCreate(body, doc));

      try {
        const res = await bulkWrite({
          body,
          requestTimeout: Infinity,
        });

        count += (res.items || []).length;

        logger.info(`Adding pages progressing: (count=${count}, errors=${res.errors}, took=${res.took}ms)`);

        if (isEmittingProgressEvent) {
          searchEvent.emit('addPageProgress', totalCount, count, skipped);
        }
      }
      catch (err) {
        logger.error('addAllPages error on add anyway: ', err);
      }

      callback();
    },
    final(callback) {
      logger.info(`Adding pages has terminated: (totalCount=${totalCount}, skipped=${skipped})`);

      if (isEmittingProgressEvent) {
        searchEvent.emit('finishAddPage', totalCount, count, skipped);
      }
      callback();
    },
  });

  readStream
    .pipe(thinOutStream)
    .pipe(batchingStream)
    .pipe(appendBookmarkCountStream)
    .pipe(appendTagNamesStream)
    .pipe(writeStream);

  return streamToPromise(readStream);

};

SearchClient.prototype.deletePages = function(pages) {
  const self = this;
  const body = [];

  pages.map((page) => {
    self.prepareBodyForDelete(body, page);
    return;
  });

  logger.debug('deletePages(): Sending Request to ES', body);
  return this.client.bulk({
    body,
  });
};

/**
 * search returning type:
 * {
 *   meta: { total: Integer, results: Integer},
 *   data: [ pages ...],
 * }
 */
SearchClient.prototype.search = async function(query) {
  // for debug
  if (process.env.NODE_ENV === 'development') {
    const result = await this.client.indices.validateQuery({
      explain: true,
      body: {
        query: query.body.query,
      },
    });
    logger.debug('ES returns explanations: ', result.explanations);
  }

  const result = await this.client.search(query);

  // for debug
  logger.debug('ES result: ', result);

  return {
    meta: {
      took: result.took,
      total: result.hits.total,
      results: result.hits.hits.length,
    },
    data: result.hits.hits.map((elm) => {
      return { _id: elm._id, _score: elm._score, _source: elm._source };
    }),
  };
};

SearchClient.prototype.createSearchQuerySortedByUpdatedAt = function(option) {
  // getting path by default is almost for debug
  let fields = ['path', 'bookmark_count', 'tag_names'];
  if (option) {
    fields = option.fields || fields;
  }

  // default is only id field, sorted by updated_at
  const query = {
    index: this.aliasName,
    type: 'pages',
    body: {
      sort: [{ updated_at: { order: 'desc' } }],
      query: {}, // query
      _source: fields,
    },
  };
  this.appendResultSize(query);

  return query;
};

SearchClient.prototype.createSearchQuerySortedByScore = function(option) {
  let fields = ['path', 'bookmark_count', 'tag_names'];
  if (option) {
    fields = option.fields || fields;
  }

  // sort by score
  const query = {
    index: this.aliasName,
    type: 'pages',
    body: {
      sort: [{ _score: { order: 'desc' } }],
      query: {}, // query
      _source: fields,
    },
  };
  this.appendResultSize(query);

  return query;
};

SearchClient.prototype.appendResultSize = function(query, from, size) {
  query.from = from || this.DEFAULT_OFFSET;
  query.size = size || this.DEFAULT_LIMIT;
};

SearchClient.prototype.initializeBoolQuery = function(query) {
  // query is created by createSearchQuerySortedByScore() or createSearchQuerySortedByUpdatedAt()
  if (!query.body.query.bool) {
    query.body.query.bool = {};
  }

  const isInitialized = (query) => { return !!query && Array.isArray(query) };

  if (!isInitialized(query.body.query.bool.filter)) {
    query.body.query.bool.filter = [];
  }
  if (!isInitialized(query.body.query.bool.must)) {
    query.body.query.bool.must = [];
  }
  if (!isInitialized(query.body.query.bool.must_not)) {
    query.body.query.bool.must_not = [];
  }
  return query;
};

SearchClient.prototype.appendCriteriaForQueryString = function(query, queryString) {
  query = this.initializeBoolQuery(query); // eslint-disable-line no-param-reassign

  // parse
  const parsedKeywords = this.parseQueryString(queryString);

  if (parsedKeywords.match.length > 0) {
    const q = {
      multi_match: {
        query: parsedKeywords.match.join(' '),
        type: 'most_fields',
        fields: ['path.ja^2', 'path.en^2', 'body.ja', 'body.en'],
      },
    };
    query.body.query.bool.must.push(q);
  }

  if (parsedKeywords.not_match.length > 0) {
    const q = {
      multi_match: {
        query: parsedKeywords.not_match.join(' '),
        fields: ['path.ja', 'path.en', 'body.ja', 'body.en'],
        operator: 'or',
      },
    };
    query.body.query.bool.must_not.push(q);
  }

  if (parsedKeywords.phrase.length > 0) {
    const phraseQueries = [];
    parsedKeywords.phrase.forEach((phrase) => {
      phraseQueries.push({
        multi_match: {
          query: phrase, // each phrase is quoteted words
          type: 'phrase',
          fields: [
            // Not use "*.ja" fields here, because we want to analyze (parse) search words
            'path.raw^2',
            'body',
          ],
        },
      });
    });

    query.body.query.bool.must.push(phraseQueries);
  }

  if (parsedKeywords.not_phrase.length > 0) {
    const notPhraseQueries = [];
    parsedKeywords.not_phrase.forEach((phrase) => {
      notPhraseQueries.push({
        multi_match: {
          query: phrase, // each phrase is quoteted words
          type: 'phrase',
          fields: [
            // Not use "*.ja" fields here, because we want to analyze (parse) search words
            'path.raw^2',
            'body',
          ],
        },
      });
    });

    query.body.query.bool.must_not.push(notPhraseQueries);
  }

  if (parsedKeywords.prefix.length > 0) {
    const queries = parsedKeywords.prefix.map((path) => {
      return { prefix: { 'path.raw': path } };
    });
    query.body.query.bool.filter.push({ bool: { should: queries } });
  }

  if (parsedKeywords.not_prefix.length > 0) {
    const queries = parsedKeywords.not_prefix.map((path) => {
      return { prefix: { 'path.raw': path } };
    });
    query.body.query.bool.filter.push({ bool: { must_not: queries } });
  }

  if (parsedKeywords.tag.length > 0) {
    const queries = parsedKeywords.tag.map((tag) => {
      return { term: { tag_names: tag } };
    });
    query.body.query.bool.filter.push({ bool: { must: queries } });
  }

  if (parsedKeywords.not_tag.length > 0) {
    const queries = parsedKeywords.not_tag.map((tag) => {
      return { term: { tag_names: tag } };
    });
    query.body.query.bool.filter.push({ bool: { must_not: queries } });
  }
};

SearchClient.prototype.filterPagesByViewer = async function(query, user, userGroups) {
  const showPagesRestrictedByOwner = !this.configManager.getConfig('crowi', 'security:list-policy:hideRestrictedByOwner');
  const showPagesRestrictedByGroup = !this.configManager.getConfig('crowi', 'security:list-policy:hideRestrictedByGroup');

  query = this.initializeBoolQuery(query); // eslint-disable-line no-param-reassign

  const Page = this.crowi.model('Page');
  const {
    GRANT_PUBLIC, GRANT_RESTRICTED, GRANT_SPECIFIED, GRANT_OWNER, GRANT_USER_GROUP,
  } = Page;

  const grantConditions = [
    { term: { grant: GRANT_PUBLIC } },
  ];

  // ensure to hit to GRANT_RESTRICTED pages that the user specified at own
  if (user != null) {
    grantConditions.push(
      {
        bool: {
          must: [
            { term: { grant: GRANT_RESTRICTED } },
            { term: { granted_users: user._id.toString() } },
          ],
        },
      },
    );
  }

  if (showPagesRestrictedByOwner) {
    grantConditions.push(
      { term: { grant: GRANT_SPECIFIED } },
      { term: { grant: GRANT_OWNER } },
    );
  }
  else if (user != null) {
    grantConditions.push(
      {
        bool: {
          must: [
            { term: { grant: GRANT_SPECIFIED } },
            { term: { granted_users: user._id.toString() } },
          ],
        },
      },
      {
        bool: {
          must: [
            { term: { grant: GRANT_OWNER } },
            { term: { granted_users: user._id.toString() } },
          ],
        },
      },
    );
  }

  if (showPagesRestrictedByGroup) {
    grantConditions.push(
      { term: { grant: GRANT_USER_GROUP } },
    );
  }
  else if (userGroups != null && userGroups.length > 0) {
    const userGroupIds = userGroups.map((group) => { return group._id.toString() });
    grantConditions.push(
      {
        bool: {
          must: [
            { term: { grant: GRANT_USER_GROUP } },
            { terms: { granted_group: userGroupIds } },
          ],
        },
      },
    );
  }

  query.body.query.bool.filter.push({ bool: { should: grantConditions } });
};

SearchClient.prototype.filterPortalPages = function(query) {
  query = this.initializeBoolQuery(query); // eslint-disable-line no-param-reassign

  query.body.query.bool.must_not.push(this.queries.USER);
  query.body.query.bool.filter.push(this.queries.PORTAL);
};

SearchClient.prototype.filterPublicPages = function(query) {
  query = this.initializeBoolQuery(query); // eslint-disable-line no-param-reassign

  query.body.query.bool.must_not.push(this.queries.USER);
  query.body.query.bool.filter.push(this.queries.PUBLIC);
};

SearchClient.prototype.filterUserPages = function(query) {
  query = this.initializeBoolQuery(query); // eslint-disable-line no-param-reassign

  query.body.query.bool.filter.push(this.queries.USER);
};

SearchClient.prototype.filterPagesByType = function(query, type) {
  const Page = this.crowi.model('Page');

  switch (type) {
    case Page.TYPE_PORTAL:
      return this.filterPortalPages(query);
    case Page.TYPE_PUBLIC:
      return this.filterPublicPages(query);
    case Page.TYPE_USER:
      return this.filterUserPages(query);
    default:
      return query;
  }
};

SearchClient.prototype.appendFunctionScore = function(query, queryString) {
  const User = this.crowi.model('User');
  const count = User.count({}) || 1;

  const minScore = queryString.length * 0.1 - 1; // increase with length
  logger.debug('min_score: ', minScore);

  query.body.query = {
    function_score: {
      query: { ...query.body.query },
      // // disable min_score -- 2019.02.28 Yuki Takei
      // // more precise adjustment is needed...
      // min_score: minScore,
      field_value_factor: {
        field: 'bookmark_count',
        modifier: 'log1p',
        factor: 10000 / count,
        missing: 0,
      },
      boost_mode: 'sum',
    },
  };
};

SearchClient.prototype.searchKeyword = async function(queryString, user, userGroups, option) {
  const from = option.offset || null;
  const size = option.limit || null;
  const type = option.type || null;
  const query = this.createSearchQuerySortedByScore();
  this.appendCriteriaForQueryString(query, queryString);

  this.filterPagesByType(query, type);
  await this.filterPagesByViewer(query, user, userGroups);

  this.appendResultSize(query, from, size);

  this.appendFunctionScore(query, queryString);

  return this.search(query);
};

SearchClient.prototype.parseQueryString = function(queryString) {
  const matchWords = [];
  const notMatchWords = [];
  const phraseWords = [];
  const notPhraseWords = [];
  const prefixPaths = [];
  const notPrefixPaths = [];
  const tags = [];
  const notTags = [];

  queryString.trim();
  queryString = queryString.replace(/\s+/g, ' '); // eslint-disable-line no-param-reassign

  // First: Parse phrase keywords
  const phraseRegExp = new RegExp(/(-?"[^"]+")/g);
  const phrases = queryString.match(phraseRegExp);

  if (phrases !== null) {
    queryString = queryString.replace(phraseRegExp, ''); // eslint-disable-line no-param-reassign

    phrases.forEach((phrase) => {
      phrase.trim();
      if (phrase.match(/^-/)) {
        notPhraseWords.push(phrase.replace(/^-/, ''));
      }
      else {
        phraseWords.push(phrase);
      }
    });
  }

  // Second: Parse other keywords (include minus keywords)
  queryString.split(' ').forEach((word) => {
    if (word === '') {
      return;
    }

    // https://regex101.com/r/pN9XfK/1
    const matchNegative = word.match(/^-(prefix:|tag:)?(.+)$/);
    // https://regex101.com/r/3qw9FQ/1
    const matchPositive = word.match(/^(prefix:|tag:)?(.+)$/);

    if (matchNegative != null) {
      if (matchNegative[1] === 'prefix:') {
        notPrefixPaths.push(matchNegative[2]);
      }
      else if (matchNegative[1] === 'tag:') {
        notTags.push(matchNegative[2]);
      }
      else {
        notMatchWords.push(matchNegative[2]);
      }
    }
    else if (matchPositive != null) {
      if (matchPositive[1] === 'prefix:') {
        prefixPaths.push(matchPositive[2]);
      }
      else if (matchPositive[1] === 'tag:') {
        tags.push(matchPositive[2]);
      }
      else {
        matchWords.push(matchPositive[2]);
      }
    }
  });

  return {
    match: matchWords,
    not_match: notMatchWords,
    phrase: phraseWords,
    not_phrase: notPhraseWords,
    prefix: prefixPaths,
    not_prefix: notPrefixPaths,
    tag: tags,
    not_tag: notTags,
  };
};

SearchClient.prototype.syncPageUpdated = async function(page, user) {
  logger.debug('SearchClient.syncPageUpdated', page.path);

  // delete if page should not indexed
  if (!this.shouldIndexed(page)) {
    try {
      await this.deletePages([page]);
    }
    catch (err) {
      logger.error('deletePages:ES Error', err);
    }
    return;
  }

  return this.updateOrInsertPageById(page._id);
};

SearchClient.prototype.syncPageDeleted = async function(page, user) {
  debug('SearchClient.syncPageDeleted', page.path);

  try {
    return await this.deletePages([page]);
  }
  catch (err) {
    logger.error('deletePages:ES Error', err);
  }
};

SearchClient.prototype.syncBookmarkChanged = async function(pageId) {
  logger.debug('SearchClient.syncBookmarkChanged', pageId);

  return this.updateOrInsertPageById(pageId);
};

SearchClient.prototype.syncTagChanged = async function(page) {
  logger.debug('SearchClient.syncTagChanged', page.path);

  return this.updateOrInsertPageById(page._id);
};


module.exports = SearchClient;
