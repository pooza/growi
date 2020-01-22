import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'unstated';
import { I18nextProvider } from 'react-i18next';

import loggerFactory from '@alias/logger';
import Xss from '@commons/service/xss';

import HeaderSearchBox from './components/HeaderSearchBox';
import SearchPage from './components/SearchPage';
import TagsList from './components/TagsList';
import PageEditor from './components/PageEditor';
// eslint-disable-next-line import/no-duplicates
import OptionsSelector from './components/PageEditor/OptionsSelector';
// eslint-disable-next-line import/no-duplicates
import { defaultEditorOptions, defaultPreviewOptions } from './components/PageEditor/OptionsSelector';
import SavePageControls from './components/SavePageControls';
import PageEditorByHackmd from './components/PageEditorByHackmd';
import Page from './components/Page';
import PageHistory from './components/PageHistory';
import PageComments from './components/PageComments';
import PageTimeline from './components/PageTimeline';
import CommentEditorLazyRenderer from './components/PageComment/CommentEditorLazyRenderer';
import PageAttachment from './components/PageAttachment';
import PageStatusAlert from './components/PageStatusAlert';
import RevisionPath from './components/Page/RevisionPath';
import TagLabels from './components/Page/TagLabels';
import BookmarkButton from './components/BookmarkButton';
import LikeButton from './components/LikeButton';
import PagePathAutoComplete from './components/PagePathAutoComplete';
import RecentCreated from './components/RecentCreated/RecentCreated';
import StaffCredit from './components/StaffCredit/StaffCredit';
import MyDraftList from './components/MyDraftList/MyDraftList';
import UserPictureList from './components/User/UserPictureList';
import TableOfContents from './components/TableOfContents';

import AdminHome from './components/Admin/AdminHome/AdminHome';
import UserGroupDetailPage from './components/Admin/UserGroupDetail/UserGroupDetailPage';
import MarkdownSetting from './components/Admin/MarkdownSetting/MarkDownSetting';
import UserManagement from './components/Admin/UserManagement';
import AppSettingsPage from './components/Admin/App/AppSettingsPage';
import ManageExternalAccount from './components/Admin/ManageExternalAccount';
import UserGroupPage from './components/Admin/UserGroup/UserGroupPage';
import Customize from './components/Admin/Customize/Customize';
import ImportDataPage from './components/Admin/ImportDataPage';
import ExportArchiveDataPage from './components/Admin/ExportArchiveDataPage';
import FullTextSearchManagement from './components/Admin/FullTextSearchManagement';

import AppContainer from './services/AppContainer';
import PageContainer from './services/PageContainer';
import CommentContainer from './services/CommentContainer';
import EditorContainer from './services/EditorContainer';
import TagContainer from './services/TagContainer';
import AdminHomeContainer from './services/AdminHomeContainer';
import AdminCustomizeContainer from './services/AdminCustomizeContainer';
import UserGroupDetailContainer from './services/UserGroupDetailContainer';
import AdminUsersContainer from './services/AdminUsersContainer';
import AdminAppContainer from './services/AdminAppContainer';
import WebsocketContainer from './services/WebsocketContainer';
import AdminMarkDownContainer from './services/AdminMarkDownContainer';
import AdminExternalAccountsContainer from './services/AdminExternalAccountsContainer';

const logger = loggerFactory('growi:app');

if (!window) {
  window = {};
}

// setup xss library
const xss = new Xss();
window.xss = xss;

// create unstated container instance
const appContainer = new AppContainer();
const websocketContainer = new WebsocketContainer(appContainer);
const pageContainer = new PageContainer(appContainer);
const commentContainer = new CommentContainer(appContainer);
const editorContainer = new EditorContainer(appContainer, defaultEditorOptions, defaultPreviewOptions);
const tagContainer = new TagContainer(appContainer);
const injectableContainers = [
  appContainer, websocketContainer, pageContainer, commentContainer, editorContainer, tagContainer,
];

logger.info('unstated containers have been initialized');

appContainer.initPlugins();
appContainer.injectToWindow();

const i18n = appContainer.i18n;

/**
 * define components
 *  key: id of element
 *  value: React Element
 */
let componentMappings = {
  'search-top': <HeaderSearchBox crowi={appContainer} />,
  'search-sidebar': <HeaderSearchBox crowi={appContainer} />,
  'search-page': <SearchPage crowi={appContainer} />,

  // 'revision-history': <PageHistory pageId={pageId} />,
  'tags-page': <TagsList crowi={appContainer} />,

  'create-page-name-input': <PagePathAutoComplete crowi={appContainer} initializedPath={pageContainer.state.path} addTrailingSlash />,

  'page-editor': <PageEditor />,
  'page-editor-options-selector': <OptionsSelector crowi={appContainer} />,
  'page-status-alert': <PageStatusAlert />,
  'save-page-controls': <SavePageControls />,

  'user-created-list': <RecentCreated />,
  'user-draft-list': <MyDraftList />,

  'admin-full-text-search-management': <FullTextSearchManagement />,

  'staff-credit': <StaffCredit />,
  'admin-importer': <ImportDataPage />,
};

// additional definitions if data exists
if (pageContainer.state.pageId != null) {
  componentMappings = Object.assign({
    'page-editor-with-hackmd': <PageEditorByHackmd />,
    'page-comments-list': <PageComments />,
    'page-attachment': <PageAttachment />,
    'page-timeline': <PageTimeline />,
    'page-comment-write': <CommentEditorLazyRenderer />,
    'revision-toc': <TableOfContents />,
    'like-button': <LikeButton pageId={pageContainer.state.pageId} isLiked={pageContainer.state.isLiked} />,
    'seen-user-list': <UserPictureList userIds={pageContainer.state.seenUserIds} />,
    'liker-list': <UserPictureList userIds={pageContainer.state.likerUserIds} />,
    'bookmark-button': <BookmarkButton pageId={pageContainer.state.pageId} crowi={appContainer} />,
    'bookmark-button-lg': <BookmarkButton pageId={pageContainer.state.pageId} crowi={appContainer} size="lg" />,
    'rename-page-name-input': <PagePathAutoComplete crowi={appContainer} initializedPath={pageContainer.state.path} />,
    'duplicate-page-name-input': <PagePathAutoComplete crowi={appContainer} initializedPath={pageContainer.state.path} />,
  }, componentMappings);
}
if (pageContainer.state.path != null) {
  componentMappings = Object.assign({
    // eslint-disable-next-line quote-props
    'page': <Page />,
    'revision-path': <RevisionPath behaviorType={appContainer.config.behaviorType} pageId={pageContainer.state.pageId} pagePath={pageContainer.state.path} />,
    'tag-label': <TagLabels />,
  }, componentMappings);
}

Object.keys(componentMappings).forEach((key) => {
  const elem = document.getElementById(key);
  if (elem) {
    ReactDOM.render(
      <I18nextProvider i18n={i18n}>
        <Provider inject={injectableContainers}>
          {componentMappings[key]}
        </Provider>
      </I18nextProvider>,
      elem,
    );
  }
});

// create unstated container instance for admin
const adminHomeContainer = new AdminHomeContainer(appContainer);
const adminCustomizeContainer = new AdminCustomizeContainer(appContainer);
const adminUsersContainer = new AdminUsersContainer(appContainer);
const adminExternalAccountsContainer = new AdminExternalAccountsContainer(appContainer);
const adminMarkDownContainer = new AdminMarkDownContainer(appContainer);
const adminContainers = {
  'admin-home': adminHomeContainer,
  'admin-customize': adminCustomizeContainer,
  'admin-user-page': adminUsersContainer,
  'admin-external-account-setting': adminExternalAccountsContainer,
  'admin-markdown-setting': adminMarkDownContainer,
  'admin-export-page': websocketContainer,
};

// render for admin
const adminAppElem = document.getElementById('admin-app');
if (adminAppElem != null) {
  const adminAppContainer = new AdminAppContainer(appContainer);
  ReactDOM.render(
    <Provider inject={[injectableContainers, adminAppContainer]}>
      <I18nextProvider i18n={i18n}>
        <AppSettingsPage />
      </I18nextProvider>
    </Provider>,
    adminAppElem,
  );
}

/**
 * define components
 *  key: id of element
 *  value: React Element
 */
const adminComponentMappings = {
  'admin-home': <AdminHome />,
  'admin-customize': <Customize />,
  'admin-user-page': <UserManagement />,
  'admin-external-account-setting': <ManageExternalAccount />,
  'admin-markdown-setting': <MarkdownSetting />,
  'admin-export-page': <ExportArchiveDataPage crowi={appContainer} />,
};


Object.keys(adminComponentMappings).forEach((key) => {
  const adminElem = document.getElementById(key);
  if (adminElem) {
    ReactDOM.render(
      <Provider inject={[injectableContainers, adminContainers[key]]}>
        <I18nextProvider i18n={i18n}>
          {adminComponentMappings[key]}
        </I18nextProvider>
      </Provider>,
      adminElem,
    );
  }
});

const adminUserGroupDetailElem = document.getElementById('admin-user-group-detail');
if (adminUserGroupDetailElem != null) {
  const userGroupDetailContainer = new UserGroupDetailContainer(appContainer);
  ReactDOM.render(
    <Provider inject={[userGroupDetailContainer]}>
      <I18nextProvider i18n={i18n}>
        <UserGroupDetailPage />
      </I18nextProvider>
    </Provider>,
    adminUserGroupDetailElem,
  );
}

const adminUserGroupPageElem = document.getElementById('admin-user-group-page');
if (adminUserGroupPageElem != null) {
  const isAclEnabled = adminUserGroupPageElem.getAttribute('data-isAclEnabled') === 'true';

  ReactDOM.render(
    <Provider inject={[websocketContainer]}>
      <I18nextProvider i18n={i18n}>
        <UserGroupPage
          crowi={appContainer}
          isAclEnabled={isAclEnabled}
        />
      </I18nextProvider>
    </Provider>,
    adminUserGroupPageElem,
  );
}

// うわーもうー (commented by Crowi team -- 2018.03.23 Yuki Takei)
$('a[data-toggle="tab"][href="#revision-history"]').on('show.bs.tab', () => {
  ReactDOM.render(
    <I18nextProvider i18n={i18n}>
      <PageHistory pageId={pageContainer.state.pageId} crowi={appContainer} />
    </I18nextProvider>, document.getElementById('revision-history'),
  );
});
