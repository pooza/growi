// disable no-return-await for model functions
/* eslint-disable no-return-await */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const ObjectId = mongoose.Schema.Types.ObjectId;


/*
 * define schema
 */
const schema = new mongoose.Schema({
  relatedPage: {
    type: ObjectId,
    ref: 'Page',
    required: true,
  },
  relatedTag: {
    type: ObjectId,
    ref: 'Tag',
    required: true,
  },
});
schema.plugin(mongoosePaginate);

/**
 * PageTagRelation Class
 *
 * @class PageTagRelation
 */
class PageTagRelation {

  static async createIfNotExist(pageId, tagId) {
    if (!await this.findOne({ relatedPage: pageId, relatedTag: tagId })) {
      await this.create({ relatedPage: pageId, relatedTag: tagId });
    }
  }

  static async createTagListWithCount(option) {
    const opt = option || {};
    const sortOpt = opt.sortOpt || {};
    const offset = opt.offset || 0;
    const limit = opt.limit || 50;

    const tags = await this.aggregate()
      .group({ _id: '$relatedTag', count: { $sum: 1 } })
      .sort(sortOpt);

    const list = tags.slice(offset, offset + limit);
    const totalCount = tags.length;

    return { list, totalCount };
  }

}

module.exports = function() {
  schema.loadClass(PageTagRelation);
  const model = mongoose.model('PageTagRelation', schema);
  return model;
};
