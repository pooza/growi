import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';

import { createSubscribedElement } from '../../UnstatedUtils';

import AppContainer from '../../../services/AppContainer';
import AdminMarkDownContainer from '../../../services/AdminMarkDownContainer';

class PresentationLineBreakOptions extends React.Component {

  render() {
    const { t, adminMarkDownContainer } = this.props;
    const { pageBreakOption, customRegularExpression } = adminMarkDownContainer.state;

    return (
      <Fragment>
        <div className="col-xs-3 radio radio-primary">
          <input
            type="radio"
            id="pageBreakOption1"
            checked={pageBreakOption === 1}
            onChange={() => { adminMarkDownContainer.setState({ pageBreakOption: 1 }) }}
          />
          <label htmlFor="pageBreakOption1">
            <p className="font-weight-bold">{ t('markdown_setting.Preset one separator') }</p>
            <div className="mt-3">
              { t('markdown_setting.Preset one separator desc') }
              <pre><code>{ t('markdown_setting.Preset one separator value') }</code></pre>
            </div>
          </label>
        </div>

        <div className="col-xs-3 radio radio-primary mt-3">
          <input
            type="radio"
            id="pageBreakOption2"
            checked={pageBreakOption === 2}
            onChange={() => { adminMarkDownContainer.setState({ pageBreakOption: 2 }) }}
          />
          <label htmlFor="pageBreakOption2">
            <p className="font-weight-bold">{ t('markdown_setting.Preset two separator') }</p>
            <div className="mt-3">
              { t('markdown_setting.Preset two separator desc') }
              <pre><code>{ t('markdown_setting.Preset two separator value') }</code></pre>
            </div>
          </label>
        </div>

        <div className="col-xs-3 radio radio-primary mt-3">
          <input
            type="radio"
            id="pageBreakOption3"
            checked={pageBreakOption === 3}
            onChange={() => { adminMarkDownContainer.setState({ pageBreakOption: 3 }) }}
          />
          <label htmlFor="pageBreakOption3">
            <p className="font-weight-bold">{ t('markdown_setting.Custom separator') }</p>
            <div className="mt-3">
              { t('markdown_setting.Custom separator desc') }
              <input
                className="form-control"
                defaultValue={customRegularExpression}
                onChange={(e) => { adminMarkDownContainer.setState({ customRegularExpression: e.target.value }) }}
              />
            </div>
          </label>
        </div>
      </Fragment>
    );
  }

}

const PresentationLineBreakOptionsWrapper = (props) => {
  return createSubscribedElement(PresentationLineBreakOptions, props, [AppContainer, AdminMarkDownContainer]);
};

PresentationLineBreakOptions.propTypes = {
  t: PropTypes.func.isRequired, // i18next
  appContainer: PropTypes.instanceOf(AppContainer).isRequired,
  adminMarkDownContainer: PropTypes.instanceOf(AdminMarkDownContainer).isRequired,

};

export default withTranslation()(PresentationLineBreakOptionsWrapper);
