import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import Modal from 'react-bootstrap/es/Modal';

import UserGroupUserFormByInput from './UserGroupUserFormByInput';
import { createSubscribedElement } from '../../UnstatedUtils';
import AppContainer from '../../../services/AppContainer';
import UserGroupDetailContainer from '../../../services/UserGroupDetailContainer';
import RadioButtonForSerchUserOption from './RadioButtonForSerchUserOption';
import CheckBoxForSerchUserOption from './CheckBoxForSerchUserOption';

class UserGroupUserModal extends React.Component {

  render() {
    const { t, userGroupDetailContainer } = this.props;

    return (
      <Modal show={userGroupDetailContainer.state.isUserGroupUserModalOpen} onHide={userGroupDetailContainer.closeUserGroupUserModal}>
        <Modal.Header closeButton>
          <Modal.Title>{t('admin:user_group_management.add_modal.add_user')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="p-3">
            <UserGroupUserFormByInput />
          </div>
          <h2 className="border-bottom">{t('admin:user_group_management.add_modal.search_option')}</h2>
          <div className="row mt-4">
            <div className="col-xs-6">
              <div className="mb-5">
                <CheckBoxForSerchUserOption
                  option="Mail"
                  checked={userGroupDetailContainer.state.isAlsoMailSearched}
                  onChange={userGroupDetailContainer.switchIsAlsoMailSearched}
                />
              </div>
              <div className="mb-5">
                <CheckBoxForSerchUserOption
                  option="Name"
                  checked={userGroupDetailContainer.state.isAlsoNameSearched}
                  onChange={userGroupDetailContainer.switchIsAlsoNameSearched}
                />
              </div>
            </div>
            <div className="col-xs-6">
              <div className="mb-5">
                <RadioButtonForSerchUserOption
                  searchType="forward"
                  checked={userGroupDetailContainer.state.searchType === 'forward'}
                  onChange={() => { userGroupDetailContainer.switchSearchType('forward') }}
                />
              </div>
              <div className="mb-5">
                <RadioButtonForSerchUserOption
                  searchType="partial"
                  checked={userGroupDetailContainer.state.searchType === 'partial'}
                  onChange={() => { userGroupDetailContainer.switchSearchType('partial') }}
                />
              </div>
              <div className="mb-5">
                <RadioButtonForSerchUserOption
                  searchType="backward"
                  checked={userGroupDetailContainer.state.searchType === 'backword'}
                  onChange={() => { userGroupDetailContainer.switchSearchType('backword') }}
                />
              </div>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    );
  }

}

UserGroupUserModal.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,
  userGroupDetailContainer: PropTypes.instanceOf(UserGroupDetailContainer).isRequired,
};

/**
 * Wrapper component for using unstated
 */
const UserGroupUserModalWrapper = (props) => {
  return createSubscribedElement(UserGroupUserModal, props, [AppContainer, UserGroupDetailContainer]);
};

export default withTranslation()(UserGroupUserModalWrapper);
