import React from 'react';
import PropTypes from 'prop-types';
import * as toastr from 'toastr';

import { withTranslation } from 'react-i18next';

import Page from '../PageList/Page';
import SearchResultList from './SearchResultList';
import DeletePageListModal from './DeletePageListModal';
import AppContainer from '../../services/AppContainer';
import { createSubscribedElement } from '../UnstatedUtils';

class SearchResult extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      deletionMode: false,
      selectedPages: new Set(),
      isDeleteCompletely: undefined,
      isDeleteConfirmModalShown: false,
      errorMessageForDeleting: undefined,
    };
    this.toggleDeleteCompletely = this.toggleDeleteCompletely.bind(this);
    this.deleteSelectedPages = this.deleteSelectedPages.bind(this);
    this.closeDeleteConfirmModal = this.closeDeleteConfirmModal.bind(this);
  }

  isNotSearchedYet() {
    return !this.props.searchResultMeta.took;
  }

  isNotFound() {
    return this.props.searchingKeyword !== '' && this.props.pages.length === 0;
  }

  isError() {
    if (this.props.searchError !== null) {
      return true;
    }
    return false;
  }

  /**
   * toggle checkbox and add (or delete from) selected pages list
   *
   * @param {any} page
   * @memberof SearchResult
   */
  toggleCheckbox(page) {
    if (this.state.selectedPages.has(page)) {
      this.state.selectedPages.delete(page);
    }
    else {
      this.state.selectedPages.add(page);
    }
    this.setState({ isDeleteConfirmModalShown: false });
    this.setState({ selectedPages: this.state.selectedPages });
  }

  /**
   * check and return is all pages selected for delete?
   *
   * @returns all pages selected (or not)
   * @memberof SearchResult
   */
  isAllSelected() {
    return this.state.selectedPages.size === this.props.pages.length;
  }

  /**
   * handle checkbox clicking that all pages select for delete
   *
   * @memberof SearchResult
   */
  handleAllSelect() {
    if (this.isAllSelected()) {
      this.state.selectedPages.clear();
    }
    else {
      this.state.selectedPages.clear();
      this.props.pages.map((page) => {
        this.state.selectedPages.add(page);
        return;
      });
    }
    this.setState({ selectedPages: this.state.selectedPages });
  }

  /**
   * change deletion mode
   *
   * @memberof SearchResult
   */
  handleDeletionModeChange() {
    this.state.selectedPages.clear();
    this.setState({ deletionMode: !this.state.deletionMode });
  }

  /**
   * toggle check delete completely
   *
   * @memberof SearchResult
   */
  toggleDeleteCompletely() {
    // request で completely が undefined でないと指定アリと見なされるため
    this.setState({ isDeleteCompletely: this.state.isDeleteCompletely ? undefined : true });
  }

  /**
   * delete selected pages
   *
   * @memberof SearchResult
   */
  deleteSelectedPages() {
    const deleteCompletely = this.state.isDeleteCompletely;
    Promise.all(Array.from(this.state.selectedPages).map((page) => {
      return new Promise((resolve, reject) => {
        const pageId = page._id;
        const revisionId = page.revision._id;

        this.props.appContainer.apiPost('/pages.remove', { page_id: pageId, revision_id: revisionId, completely: deleteCompletely })
          .then((res) => {
            if (res.ok) {
              this.state.selectedPages.delete(page);
              return resolve();
            }

            return reject();

          })
          .catch((err) => {
            console.log(err.message); // eslint-disable-line no-console
            this.setState({ errorMessageForDeleting: err.message });
            return reject();
          });
      });
    }))
      .then(() => {
        window.location.reload();
      })
      .catch((err) => {
        toastr.error(err, 'Error occured', {
          closeButton: true,
          progressBar: true,
          newestOnTop: false,
          showDuration: '100',
          hideDuration: '100',
          timeOut: '3000',
        });
      });
  }

  /**
   * open confirm modal for page selection delete
   *
   * @memberof SearchResult
   */
  showDeleteConfirmModal() {
    this.setState({ isDeleteConfirmModalShown: true });
  }

  /**
   * close confirm modal for page selection delete
   *
   * @memberof SearchResult
   */
  closeDeleteConfirmModal() {
    this.setState({
      isDeleteConfirmModalShown: false,
      errorMessageForDeleting: undefined,
    });
  }

  render() {
    const { t } = this.props;

    if (this.isError()) {
      return (
        <div className="content-main">
          <i className="searcing fa fa-warning"></i> Error on searching.
        </div>
      );
    }

    if (this.isNotSearchedYet()) {
      return <div />;
    }

    if (this.isNotFound()) {
      let under = '';
      if (this.props.tree != null) {
        under = ` under "${this.props.tree}"`;
      }
      return (
        <div className="content-main">
          <i className="icon-fw icon-info" /> No page found with &quot;{this.props.searchingKeyword}&quot;{under}
        </div>
      );

    }

    let deletionModeButtons = '';
    let allSelectCheck = '';

    if (this.state.deletionMode) {
      deletionModeButtons = (
        <div className="btn-group">
          <button type="button" className="btn btn-rounded btn-default btn-xs" onClick={() => { return this.handleDeletionModeChange() }}>
            <i className="icon-ban" /> {t('search_result.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-rounded btn-danger btn-xs"
            onClick={() => { return this.showDeleteConfirmModal() }}
            disabled={this.state.selectedPages.size === 0}
          >
            <i className="icon-trash" /> {t('search_result.delete')}
          </button>
        </div>
      );
      allSelectCheck = (
        <div>
          <label>
            <input
              type="checkbox"
              onClick={() => { return this.handleAllSelect() }}
              checked={this.isAllSelected()}
            />
            {t('search_result.check_all')}
          </label>
        </div>
      );
    }
    else {
      deletionModeButtons = (
        <div className="btn-group">
          <button type="button" className="btn btn-default btn-rounded btn-xs" onClick={() => { return this.handleDeletionModeChange() }}>
            <i className="ti-check-box" /> {t('search_result.deletion_mode_btn_lavel')}
          </button>
        </div>
      );
    }

    const listView = this.props.pages.map((page) => {
      const pageId = `#${page._id}`;
      return (
        <Page
          page={page}
          linkTo={pageId}
          key={page._id}
        >
          { this.state.deletionMode
            && (
              <input
                type="checkbox"
                className="search-result-list-delete-checkbox"
                value={pageId}
                checked={this.state.selectedPages.has(page)}
                onClick={() => { return this.toggleCheckbox(page) }}
              />
            )
            }
          <div className="page-list-option">
            <a href={page.path}><i className="icon-login" /></a>
          </div>
        </Page>
      );
    });

    // TODO あとでなんとかする
    setTimeout(() => {
      $('#search-result-list > nav').affix({ offset: { top: 50 } });
    }, 1200);

    /*
    UI あとで考える
    <span className="search-result-meta">Found: {this.props.searchResultMeta.total} pages with "{this.props.searchingKeyword}"</span>
    */
    return (
      <div className="content-main">
        <div className="search-result row" id="search-result">
          <div className="col-md-4 hidden-xs hidden-sm page-list search-result-list" id="search-result-list">
            <nav data-spy="affix" data-offset-top="50">
              <div className="pull-right">
                {deletionModeButtons}
                {allSelectCheck}
              </div>
              <div className="search-result-meta">
                <i className="icon-magnifier" />
                {t('search_result.result_meta', { total: this.props.searchResultMeta.total, keyword: this.props.searchingKeyword })}
              </div>
              <div className="clearfix"></div>
              <div className="page-list">
                <ul className="page-list-ul page-list-ul-flat nav">{listView}</ul>
              </div>
            </nav>
          </div>
          <div className="col-md-8 search-result-content" id="search-result-content">
            <SearchResultList pages={this.props.pages} searchingKeyword={this.props.searchingKeyword} />
          </div>
        </div>
        <DeletePageListModal
          isShown={this.state.isDeleteConfirmModalShown}
          pages={Array.from(this.state.selectedPages)}
          errorMessage={this.state.errorMessageForDeleting}
          cancel={this.closeDeleteConfirmModal}
          confirmedToDelete={this.deleteSelectedPages}
          toggleDeleteCompletely={this.toggleDeleteCompletely}
        />
      </div> // content-main
    );
  }

}

/**
 * Wrapper component for using unstated
 */
const SearchResultWrapper = (props) => {
  return createSubscribedElement(SearchResult, props, [AppContainer]);
};

SearchResult.propTypes = {
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,
  t: PropTypes.func.isRequired, // i18next

  pages: PropTypes.array.isRequired,
  searchingKeyword: PropTypes.string.isRequired,
  searchResultMeta: PropTypes.object.isRequired,
  searchError: PropTypes.object,
  tree: PropTypes.string,
};
SearchResult.defaultProps = {
  searchError: null,
};

export default withTranslation()(SearchResultWrapper);
