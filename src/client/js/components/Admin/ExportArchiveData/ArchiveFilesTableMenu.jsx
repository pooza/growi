import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';

import { createSubscribedElement } from '../../UnstatedUtils';
import AppContainer from '../../../services/AppContainer';
// import { toastSuccess, toastError } from '../../../util/apiNotification';

class ArchiveFilesTableMenu extends React.Component {

  render() {
    const { t } = this.props;

    return (
      <div className="btn-group admin-user-menu">
        <button type="button" className="btn btn-sm btn-default dropdown-toggle" data-toggle="dropdown">
          <i className="icon-settings"></i> <span className="caret"></span>
        </button>
        <ul className="dropdown-menu" role="menu">
          <li className="dropdown-header">{t('admin:export_management.export_menu')}</li>
          <li>
            <a type="button" href={`/admin/export/${this.props.fileName}`}>
              <i className="icon-cloud-download" /> {t('admin:export_management.download')}
            </a>
          </li>
          <li>
            <a type="button" role="button" onClick={() => this.props.onZipFileStatRemove(this.props.fileName)}>
              <span className="text-danger"><i className="icon-trash" /> {t('admin:export_management.delete')}</span>
            </a>
          </li>
        </ul>
      </div>
    );
  }

}

ArchiveFilesTableMenu.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,
  fileName: PropTypes.string.isRequired,
  onZipFileStatRemove: PropTypes.func.isRequired,
};

/**
 * Wrapper component for using unstated
 */
const ArchiveFilesTableMenuWrapper = (props) => {
  return createSubscribedElement(ArchiveFilesTableMenu, props, [AppContainer]);
};

export default withTranslation()(ArchiveFilesTableMenuWrapper);
