import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import { format } from 'date-fns';

import { createSubscribedElement } from '../../UnstatedUtils';
import AppContainer from '../../../services/AppContainer';
// import { toastSuccess, toastError } from '../../../util/apiNotification';

import ArchiveFilesTableMenu from './ArchiveFilesTableMenu';

class ArchiveFilesTable extends React.Component {

  render() {
    // eslint-disable-next-line no-unused-vars
    const { t } = this.props;

    return (
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>{t('export_management.file')}</th>
            <th>{t('export_management.growi_version')}</th>
            <th>{t('export_management.collections')}</th>
            <th>{t('export_management.exported_at')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {this.props.zipFileStats.map(({ meta, fileName, innerFileStats }) => {
            return (
              <tr key={fileName}>
                <th>{fileName}</th>
                <td>{meta.version}</td>
                <td className="text-capitalize">{innerFileStats.map(fileStat => fileStat.collectionName).join(', ')}</td>
                <td>{meta.exportedAt ? format(new Date(meta.exportedAt), 'yyyy/MM/dd HH:mm:ss') : ''}</td>
                <td>
                  <ArchiveFilesTableMenu
                    fileName={fileName}
                    onZipFileStatRemove={this.props.onZipFileStatRemove}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

}

ArchiveFilesTable.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,

  zipFileStats: PropTypes.arrayOf(PropTypes.object).isRequired,
  onZipFileStatRemove: PropTypes.func.isRequired,
};

/**
 * Wrapper component for using unstated
 */
const ArchiveFilesTableWrapper = (props) => {
  return createSubscribedElement(ArchiveFilesTable, props, [AppContainer]);
};

export default withTranslation()(ArchiveFilesTableWrapper);
