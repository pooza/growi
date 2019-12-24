/* eslint-disable no-useless-escape */
import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';

import loggerFactory from '@alias/logger';

import { createSubscribedElement } from '../../UnstatedUtils';
import { toastSuccess, toastError } from '../../../util/apiNotification';

import AppContainer from '../../../services/AppContainer';

import AdminCustomizeContainer from '../../../services/AdminCustomizeContainer';
import AdminUpdateButtonRow from '../Common/AdminUpdateButtonRow';

const logger = loggerFactory('growi:customizeHighlight');

class CustomizeHighlightSetting extends React.Component {

  constructor(props) {
    super(props);

    this.onClickSubmit = this.onClickSubmit.bind(this);
  }

  async onClickSubmit() {
    const { t, adminCustomizeContainer } = this.props;

    try {
      await adminCustomizeContainer.updateHighlightJsStyle();
      toastSuccess(t('customize_page.update_highlight_success'));
    }
    catch (err) {
      toastError(err);
      logger.error(err);
    }
  }

  getDemoFunction() {
    return `function $initHighlight(block, cls) {
    try {

      if (cls.search(/\bno\-highlight\b/) !== -1) {
        return \`\${process(block, true, 0x0F)} class="\${cls}"\`;
      }
    }
    catch (e) {
      /* handle exception */
    }
    for (let i = 0 / 2; i < classes.length; i++) {
      if (checkCondition(classes[i]) === undefined) { console.log('undefined') }
    }
  };`;
  }

  render() {
    const { t, adminCustomizeContainer } = this.props;
    const options = adminCustomizeContainer.state.highlightJsCssSelectorOptions;
    const menuItem = [];

    Object.entries(options).forEach((option) => {
      const styleId = option[0];
      const styleName = option[1].name;
      const isBorderEnable = option[1].border;

      menuItem.push(
        <li key={styleId} role="presentation" type="button" onClick={() => adminCustomizeContainer.switchHighlightJsStyle(styleId, styleName, isBorderEnable)}>
          <a role="menuitem">{styleName}</a>
        </li>,
      );
    });

    return (
      <React.Fragment>
        <h2 className="admin-setting-header">{t('customize_page.Code Highlight')}</h2>

        <div className="form-group row">
          <div className="col-xs-offset-3 col-xs-6 text-left">
            <div className="my-0 btn-group">
              <label>{t('customize_page.Theme')}</label>
              <div className="dropdown">
                <button className="btn btn-default dropdown-toggle w-100" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <span className="pull-left">{adminCustomizeContainer.state.currentHighlightJsStyleName}</span>
                  <span className="bs-caret pull-right">
                    <span className="caret" />
                  </span>
                </button>
                {/* TODO adjust dropdown after BS4 */}
                <ul className="dropdown-menu" role="menu">
                  {menuItem}
                </ul>
              </div>
              {/* eslint-disable-next-line react/no-danger */}
              <p className="help-block text-warning"><span dangerouslySetInnerHTML={{ __html:  t('customize_page.nocdn_desc') }} /></p>
            </div>
          </div>
        </div>

        <div className="form-group row">
          <div className="col-xs-offset-3 col-xs-6 text-left">
            <div className="checkbox checkbox-success">
              <input
                type="checkbox"
                id="highlightBorder"
                checked={adminCustomizeContainer.state.isHighlightJsStyleBorderEnabled}
                onChange={() => { adminCustomizeContainer.switchHighlightJsStyleBorder() }}
              />
              <label htmlFor="highlightBorder">
                <strong>Border</strong>
              </label>
            </div>
          </div>
        </div>

        <div className="help-block">
          <label>Examples:</label>
          <div className="wiki">
            <pre className={`hljs ${!adminCustomizeContainer.state.isHighlightJsStyleBorderEnabled && 'hljs-no-border'}`}>
              <code className="highlightjs-demo">
                {this.getDemoFunction()}
              </code>
            </pre>
          </div>
        </div>

        <AdminUpdateButtonRow onClick={this.onClickSubmit} disabled={adminCustomizeContainer.state.retrieveError != null} />
      </React.Fragment>
    );
  }

}

const CustomizeHighlightSettingWrapper = (props) => {
  return createSubscribedElement(CustomizeHighlightSetting, props, [AppContainer, AdminCustomizeContainer]);
};

CustomizeHighlightSetting.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,
  adminCustomizeContainer: PropTypes.instanceOf(AdminCustomizeContainer).isRequired,
};

export default withTranslation()(CustomizeHighlightSettingWrapper);
