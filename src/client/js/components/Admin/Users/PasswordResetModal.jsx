import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';

import Modal from 'react-bootstrap/es/Modal';

import { toastError } from '../../../util/apiNotification';
import { createSubscribedElement } from '../../UnstatedUtils';
import AppContainer from '../../../services/AppContainer';

class PasswordResetModal extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      temporaryPassword: [],
      isPasswordResetDone: false,
    };

    this.resetPassword = this.resetPassword.bind(this);
  }

  async resetPassword() {
    const { appContainer, userForPasswordResetModal } = this.props;

    const res = await appContainer.apiPost('/admin/users.resetPassword', { user_id: userForPasswordResetModal._id });
    if (res.ok) {
      this.setState({ temporaryPassword: res.newPassword, isPasswordResetDone: true });
    }
    else {
      toastError('Failed to reset password');
    }
  }

  renderModalBodyBeforeReset() {
    const { t, userForPasswordResetModal } = this.props;

    return (
      <div>
        <p className="alert alert-danger">{t('admin:user_management.reset_password_modal.password_reset_message')}</p>
        <p>
          {t('admin:user_management.reset_password_modal.target_user')}: <code>{userForPasswordResetModal.email}</code>
        </p>
        <p>
          {t('admin:user_management.reset_password_modal.new_password')}: <code>{this.state.temporaryPassword}</code>
        </p>
      </div>
    );
  }

  returnModalBodyAfterReset() {
    const { t, userForPasswordResetModal } = this.props;

    return (
      <div>
        <p>
          {t('admin:user_management.reset_password_modal.password_never_seen')}<br />
          <span className="text-danger">{t('admin:user_management.reset_password_modal.send_new_password')}</span>
        </p>
        <p>
          {t('admin:user_management.reset_password_modal.target_user')}: <code>{userForPasswordResetModal.email}</code>
        </p>
        <button type="submit" className="btn btn-primary" onClick={this.resetPassword}>
          {t('admin:user_management.reset_password')}
        </button>
      </div>
    );
  }

  returnModalFooter() {
    return (
      <div>
        <button type="submit" className="btn btn-primary" onClick={this.props.onClose}>OK</button>
      </div>
    );
  }


  render() {
    const { t } = this.props;

    return (
      <Modal show={this.props.isOpen} onHide={this.props.onClose}>
        <Modal.Header className="modal-header" closeButton>
          <Modal.Title>
            {t('admin:user_management.reset_password')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.state.isPasswordResetDone ? this.renderModalBodyBeforeReset() : this.returnModalBodyAfterReset()}
        </Modal.Body>
        <Modal.Footer>
          {this.state.isPasswordResetDone && this.returnModalFooter()}
        </Modal.Footer>
      </Modal>
    );
  }

}

/**
 * Wrapper component for using unstated
 */
const PasswordResetModalWrapper = (props) => {
  return createSubscribedElement(PasswordResetModal, props, [AppContainer]);
};

PasswordResetModal.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,

  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  userForPasswordResetModal: PropTypes.object,

};

export default withTranslation()(PasswordResetModalWrapper);
