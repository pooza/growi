import React from 'react';
import PropTypes from 'prop-types';

import { withTranslation } from 'react-i18next';

import Pagination from 'react-bootstrap/lib/Pagination';

import { createSubscribedElement } from '../UnstatedUtils';
import AppContainer from '../../services/AppContainer';
import PageContainer from '../../services/PageContainer';
import EditorContainer from '../../services/EditorContainer';

import Draft from './Draft';

class MyDraftList extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      drafts: [],
      currentDrafts: [],
      activePage: 1,
      paginationNumbers: {},
    };

    this.getDraftsFromLocalStorage = this.getDraftsFromLocalStorage.bind(this);
    this.getCurrentDrafts = this.getCurrentDrafts.bind(this);
    this.clearDraft = this.clearDraft.bind(this);
    this.clearAllDrafts = this.clearAllDrafts.bind(this);
    this.calculatePagination = this.calculatePagination.bind(this);
  }

  async componentWillMount() {
    await this.getDraftsFromLocalStorage();
    this.getCurrentDrafts(1);
  }

  async getDraftsFromLocalStorage() {
    const draftsAsObj = this.props.editorContainer.drafts;

    const res = await this.props.appContainer.apiGet('/pages.exist', {
      pages: draftsAsObj,
    });

    // {'/a': '#a', '/b': '#b'} => [{path: '/a', markdown: '#a'}, {path: '/b', markdown: '#b'}]
    const drafts = Object.entries(draftsAsObj).map((d) => {
      const path = d[0];
      return {
        path,
        markdown: d[1],
        isExist: res.pages[path],
      };
    });

    this.setState({ drafts });
  }

  getCurrentDrafts(selectPageNumber) {
    const { appContainer } = this.props;

    const limit = appContainer.getConfig().recentCreatedLimit;

    const totalCount = this.state.drafts.length;
    const activePage = selectPageNumber;
    const paginationNumbers = this.calculatePagination(limit, totalCount, activePage);

    const currentDrafts = this.state.drafts.slice((activePage - 1) * limit, activePage * limit);

    this.setState({
      currentDrafts,
      activePage,
      paginationNumbers,
    });
  }

  /**
   * generate Elements of Draft
   *
   * @param {any} drafts Array of pages Model Obj
   *
   */
  generateDraftList(drafts) {
    return drafts.map((draft) => {
      return (
        <Draft
          key={draft.path}
          path={draft.path}
          markdown={draft.markdown}
          isExist={draft.isExist}
          clearDraft={this.clearDraft}
        />
      );
    });
  }

  clearDraft(path) {
    this.props.editorContainer.clearDraft(path);

    this.setState((prevState) => {
      return {
        drafts: prevState.drafts.filter((draft) => { return draft.path !== path }),
        currentDrafts: prevState.drafts.filter((draft) => { return draft.path !== path }),
      };
    });
  }

  clearAllDrafts() {
    this.props.editorContainer.clearAllDrafts();

    this.setState({
      drafts: [],
      currentDrafts: [],
      activePage: 1,
      paginationNumbers: {},
    });
  }

  calculatePagination(limit, totalCount, activePage) {
    // calc totalPageNumber
    const totalPage = Math.floor(totalCount / limit) + (totalCount % limit === 0 ? 0 : 1);

    let paginationStart = activePage - 2;
    let maxViewPageNum = activePage + 2;
    // pagiNation Number area size = 5 , pageNuber calculate in here
    // activePage Position calculate ex. 4 5 [6] 7 8 (Page8 over is Max), 3 4 5 [6] 7 (Page7 is Max)
    if (paginationStart < 1) {
      const diff = 1 - paginationStart;
      paginationStart += diff;
      maxViewPageNum = Math.min(totalPage, maxViewPageNum + diff);
    }
    if (maxViewPageNum > totalPage) {
      const diff = maxViewPageNum - totalPage;
      maxViewPageNum -= diff;
      paginationStart = Math.max(1, paginationStart - diff);
    }

    return {
      totalPage,
      paginationStart,
      maxViewPageNum,
    };
  }

  /**
   * generate Elements of Pagination First Prev
   * ex.  <<   <   1  2  3  >  >>
   * this function set << & <
   */
  generateFirstPrev(activePage) {
    const paginationItems = [];
    if (activePage !== 1) {
      paginationItems.push(
        <Pagination.First key="first" onClick={() => { return this.getCurrentDrafts(1) }} />,
      );
      paginationItems.push(
        <Pagination.Prev key="prev" onClick={() => { return this.getCurrentDrafts(this.state.activePage - 1) }} />,
      );
    }
    else {
      paginationItems.push(
        <Pagination.First key="first" disabled />,
      );
      paginationItems.push(
        <Pagination.Prev key="prev" disabled />,
      );

    }
    return paginationItems;
  }

  /**
   * generate Elements of Pagination First Prev
   *  ex. << < 4 5 6 7 8 > >>, << < 1 2 3 4 > >>
   * this function set  numbers
   */
  generatePaginations(activePage, paginationStart, maxViewPageNum) {
    const paginationItems = [];
    for (let number = paginationStart; number <= maxViewPageNum; number++) {
      paginationItems.push(
        <Pagination.Item key={number} active={number === activePage} onClick={() => { return this.getCurrentDrafts(number) }}>{number}</Pagination.Item>,
      );
    }
    return paginationItems;
  }

  /**
   * generate Elements of Pagination First Prev
   * ex.  <<   <   1  2  3  >  >>
   * this function set > & >>
   */
  generateNextLast(activePage, totalPage) {
    const paginationItems = [];
    if (totalPage !== activePage) {
      paginationItems.push(
        <Pagination.Next key="next" onClick={() => { return this.getCurrentDrafts(this.state.activePage + 1) }} />,
      );
      paginationItems.push(
        <Pagination.Last key="last" onClick={() => { return this.getCurrentDrafts(totalPage) }} />,
      );
    }
    else {
      paginationItems.push(
        <Pagination.Next key="next" disabled />,
      );
      paginationItems.push(
        <Pagination.Last key="last" disabled />,
      );

    }
    return paginationItems;

  }

  render() {
    const { t } = this.props;

    const draftList = this.generateDraftList(this.state.currentDrafts);

    const paginationItems = [];

    const totalCount = this.state.drafts.length;

    const activePage = this.state.activePage;
    const totalPage = this.state.paginationNumbers.totalPage;
    const paginationStart = this.state.paginationNumbers.paginationStart;
    const maxViewPageNum = this.state.paginationNumbers.maxViewPageNum;
    const firstPrevItems = this.generateFirstPrev(activePage);
    paginationItems.push(firstPrevItems);
    const paginations = this.generatePaginations(activePage, paginationStart, maxViewPageNum);
    paginationItems.push(paginations);
    const nextLastItems = this.generateNextLast(activePage, totalPage);
    paginationItems.push(nextLastItems);

    return (
      <div className="page-list-container-create">

        { totalCount === 0
          && <span>No drafts yet.</span>
        }

        { totalCount > 0 && (
          <React.Fragment>
            <div className="d-flex justify-content-between">
              <h4>Total: {totalCount} drafts</h4>
              <div className="align-self-center">
                <button type="button" className="btn btn-sm btn-default" onClick={this.clearAllDrafts}>
                  <i className="icon-fw icon-fire text-danger"></i>
                  {t('Delete All')}
                </button>
              </div>
            </div>

            <div className="tab-pane m-t-30 accordion" id="draft-list">
              {draftList}
            </div>
            <Pagination bsSize="small">{paginationItems}</Pagination>
          </React.Fragment>
        ) }

      </div>
    );
  }

}

/**
 * Wrapper component for using unstated
 */
const MyDraftListWrapper = (props) => {
  return createSubscribedElement(MyDraftList, props, [AppContainer, PageContainer, EditorContainer]);
};


MyDraftList.propTypes = {
  t: PropTypes.func.isRequired, // react-i18next

  appContainer: PropTypes.instanceOf(AppContainer).isRequired,
  pageContainer: PropTypes.instanceOf(PageContainer).isRequired,
  editorContainer: PropTypes.instanceOf(EditorContainer).isRequired,
};

export default withTranslation()(MyDraftListWrapper);
