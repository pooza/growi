import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';

import { createSubscribedElement } from '../../UnstatedUtils';
import AppContainer from '../../../services/AppContainer';


class ManageExternalAccount extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
    };
  }


  render() {
    const { t } = this.props;

    return (
      <Fragment>
        <p>
          <a className="btn btn-default" href="/admin/users">
            <i className="icon-fw ti-arrow-left" aria-hidden="true"></i>
            { t('user_management.back_to_user_management') }
          </a>
        </p>

        <h2>{ t('user_management.external_account_list') }</h2>

        <table className="table table-bordered table-user-list">
          <thead>
            <tr>
              <th width="120px">{ t('user_management.authentication_provider') }</th>
              <th><code>accountId</code></th>
              <th>{ t('user_management.related_username', 'username') }</th>
              <th>
                { t('user_management.password_setting') }
                <div
                  className="text-muted"
                  data-toggle="popover"
                  data-placement="top"
                  data-trigger="hover focus"
                  tabIndex="0"
                  role="button"
                  data-animation="false"
                  data-html="true"
                  data-content="<small>{{ t('user_management.password_setting_help') }}</small>"
                >
                  <small>
                    <i className="icon-question" aria-hidden="true"></i>
                  </small>
                </div>
              </th>
              <th width="100px">{ t('Created') }</th>
              <th width="70px"></th>
            </tr>
          </thead>
          {/* TODO GW-328 */}
        </table>
      </Fragment>
    );
  }

}

const ManageExternalAccountWrapper = (props) => {
  return createSubscribedElement(ManageExternalAccount, props, [AppContainer]);
};

ManageExternalAccount.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,
};

export default withTranslation()(ManageExternalAccountWrapper);
