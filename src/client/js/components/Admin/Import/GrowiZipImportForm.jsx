import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import * as toastr from 'toastr';

import { createSubscribedElement } from '../../UnstatedUtils';
import AppContainer from '../../../services/AppContainer';
// import { toastSuccess, toastError } from '../../../util/apiNotification';

class GrowiImportForm extends React.Component {

  constructor(props) {
    super(props);

    this.initialState = {
      collections: new Set(),
      schema: {
        pages: {},
        revisions: {},
        // ...
      },
    };

    this.state = this.initialState;

    this.toggleCheckbox = this.toggleCheckbox.bind(this);
    this.import = this.import.bind(this);
    this.validateForm = this.validateForm.bind(this);
  }

  toggleCheckbox(e) {
    const { target } = e;
    const { name, checked } = target;

    this.setState((prevState) => {
      const collections = new Set(prevState.collections);
      if (checked) {
        collections.add(name);
      }
      else {
        collections.delete(name);
      }
      return { collections };
    });
  }

  async import(e) {
    e.preventDefault();

    try {
      // TODO: use appContainer.apiv3.post
      const { results } = await this.props.appContainer.apiPost('/v3/import', {
        fileName: this.props.fileName,
        collections: Array.from(this.state.collections),
        schema: this.state.schema,
      });

      this.setState(this.initialState);
      this.props.onPostImport();

      // TODO: toastSuccess, toastError
      toastr.success(undefined, 'Imported documents', {
        closeButton: true,
        progressBar: true,
        newestOnTop: false,
        showDuration: '100',
        hideDuration: '100',
        timeOut: '1200',
        extendedTimeOut: '150',
      });

      for (const { collectionName, failedIds } of results) {
        if (failedIds.length > 0) {
          toastr.error(`failed to insert ${failedIds.join(', ')}`, collectionName, {
            closeButton: true,
            progressBar: true,
            newestOnTop: false,
            timeOut: '30000',
          });
        }
      }
    }
    catch (err) {
      // TODO: toastSuccess, toastError
      toastr.error(err, 'Error', {
        closeButton: true,
        progressBar: true,
        newestOnTop: false,
        showDuration: '100',
        hideDuration: '100',
        timeOut: '3000',
      });
    }
  }

  validateForm() {
    return this.state.collections.size > 0;
  }

  render() {
    const { t } = this.props;

    return (
      <form className="row" onSubmit={this.import}>
        <div className="col-xs-12">
          <table className="table table-bordered table-mapping">
            <caption>{t('importer_management.growi_settings.uploaded_data')}</caption>
            <thead>
              <tr>
                <th></th>
                <th>{t('importer_management.growi_settings.extracted_file')}</th>
                <th>{t('importer_management.growi_settings.collection')}</th>
              </tr>
            </thead>
            <tbody>
              {this.props.fileStats.map((fileStat) => {
                  const { fileName, collectionName } = fileStat;
                  const checked = this.state.collections.has(collectionName);
                  return (
                    <Fragment key={collectionName}>
                      <tr>
                        <td>
                          <input
                            type="checkbox"
                            id={collectionName}
                            name={collectionName}
                            className="form-check-input"
                            value={collectionName}
                            checked={checked}
                            onChange={this.toggleCheckbox}
                          />
                        </td>
                        <td>{fileName}</td>
                        <td className="text-capitalize">{collectionName}</td>
                      </tr>
                      {checked && (
                        <tr>
                          <td className="text-muted" colSpan="3">
                            TBD: define how {collectionName} are imported
                            {/* TODO: create a component for each collection to modify this.state.schema */}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="col-xs-12 text-center">
          <button type="submit" className="btn btn-primary mx-1" disabled={!this.validateForm()}>
            { t('importer_management.import') }
          </button>
          <button type="button" className="btn btn-default mx-1" onClick={this.props.onDiscard}>
            { t('importer_management.growi_settings.discard') }
          </button>
        </div>
      </form>
    );
  }

}

GrowiImportForm.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,

  fileName: PropTypes.string,
  fileStats: PropTypes.arrayOf(PropTypes.object).isRequired,
  onDiscard: PropTypes.func.isRequired,
  onPostImport: PropTypes.func.isRequired,
};

/**
 * Wrapper component for using unstated
 */
const GrowiImportFormWrapper = (props) => {
  return createSubscribedElement(GrowiImportForm, props, [AppContainer]);
};

export default withTranslation()(GrowiImportFormWrapper);
