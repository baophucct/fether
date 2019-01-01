// Copyright 2015-2018 Parity Technologies (UK) Ltd.
// This file is part of Parity.
//
// SPDX-License-Identifier: BSD-3-Clause

import React, { Component } from 'react';
import { chainName$, withoutLoading } from '@parity/light.js';
import { inject, observer } from 'mobx-react';
import light from '@parity/light.js-react';

import check from '../../assets/img/icons/check.svg';
import loading from '../../assets/img/icons/loading.svg';
import DivWindowContent from '../../assets/theme/shared/styledComponents/DivWindowContent';

// Number of confirmations to consider a transaction successful
const MIN_CONFIRMATIONS = 6;

@light({
  chainName: () => chainName$().pipe(withoutLoading())
})
@inject('sendStore')
@observer
class Sent extends Component {
  componentWillMount () {
    // If we refresh on this page, return to homepage
    if (!this.props.sendStore.txStatus) {
      this.handleGoToHomepage();
    }
  }

  handleGoToHomepage = () => {
    const { history, sendStore } = this.props;
    sendStore.clear();
    history.push('/');
  };

  render () {
    const {
      sendStore: { confirmations }
    } = this.props;

    return (
      <DivWindowContent>
        <div className='alert-screen'>
          <div className='alert-screen_content'>
            <div className='alert-screen_image'>
              <img alt='loading' src={this.renderIcon()} />
            </div>
            <div className='alert-screen_text'>
              <h1>{this.renderTitle()}</h1>
              <p>{this.renderDescription()}</p>
              <p>{this.renderLink()}</p>
            </div>
            {confirmations >= MIN_CONFIRMATIONS && (
              <nav className='form-nav'>
                <button
                  className='button'
                  disabled={confirmations < 6}
                  onClick={this.handleGoToHomepage}
                >
                  Go back
                </button>
              </nav>
            )}
          </div>
        </div>
      </DivWindowContent>
    );
  }

  renderDescription = () => {
    const {
      sendStore: { confirmations, txStatus }
    } = this.props;

    if (!txStatus) {
      return '';
    }

    if (confirmations >= MIN_CONFIRMATIONS) {
      return null;
    }

    if (confirmations > 0) {
      return `Waiting ${confirmations}/${MIN_CONFIRMATIONS} confirmations`;
    }

    if (txStatus.confirmed) {
      return 'Waiting for confirmations...';
    }

    if (txStatus.failed) {
      return JSON.stringify(txStatus.failed);
    }

    return null;
  };

  renderIcon = () => {
    const {
      sendStore: { confirmations }
    } = this.props;
    if (confirmations >= MIN_CONFIRMATIONS) {
      return check;
    }
    return loading;
  };

  renderTitle = () => {
    const {
      sendStore: { confirmations, txStatus }
    } = this.props;

    if (!txStatus) {
      return '';
    }

    if (txStatus.confirmed) {
      return (
        <span>
          {confirmations >= MIN_CONFIRMATIONS
            ? 'Transaction confirmed'
            : 'Submitted'}
        </span>
      );
    }

    if (txStatus.failed) {
      return 'Error';
    }

    return 'Sending your transaction...';
  };

  renderLink = () => {
    const {
      chainName,
      sendStore: { confirmations, txStatus }
    } = this.props;

    if (confirmations >= 0) {
      return (
        <a
          href={`https://${
            chainName === 'foundation' ? '' : `${chainName}.`
          }etherscan.io/tx/${txStatus.confirmed.transactionHash}`}
          target='_blank'
          rel='noopener noreferrer'
        >
          <button className='button -tiny'>See it on Etherscan</button>
        </a>
      );
    }

    return null;
  };
}

export default Sent;
