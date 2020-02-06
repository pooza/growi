import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';

import { createSubscribedElement } from '../../UnstatedUtils';
import AppContainer from '../../../services/AppContainer';
import AdminUsersContainer from '../../../services/AdminUsersContainer';
import { toastSuccess, toastError } from '../../../util/apiNotification';

class UserRemoveButton extends React.Component {

  constructor(props) {
    super(props);

    this.onClickDeleteBtn = this.onClickDeleteBtn.bind(this);
  }

  async onClickDeleteBtn() {
    const { t } = this.props;

    try {
      await this.props.adminUsersContainer.removeUser(this.props.user._id);
      const { username } = this.props.user;
      toastSuccess(t('toaster.remove_user_success', { username }));
    }
    catch (err) {
      toastError(err);
    }
  }

  render() {
    const { t } = this.props;

    return (
      <a role="button" className="px-4" onClick={() => { this.onClickDeleteBtn() }}>
        <i className="icon-fw icon-fire text-danger"></i> {t('Delete')}
      </a>
    );
  }

}

/**
 * Wrapper component for using unstated
 */
const UserRemoveButtonWrapper = (props) => {
  return createSubscribedElement(UserRemoveButton, props, [AppContainer, AdminUsersContainer]);
};

UserRemoveButton.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,
  adminUsersContainer: PropTypes.instanceOf(AdminUsersContainer).isRequired,

  user: PropTypes.object.isRequired,
};

export default withTranslation()(UserRemoveButtonWrapper);
