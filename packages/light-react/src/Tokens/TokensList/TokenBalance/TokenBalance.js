// Copyright 2015-2018 Parity Technologies (UK) Ltd.
// This file is part of Parity.
//
// SPDX-License-Identifier: MIT

import React, { Component } from 'react';
import abi from '@parity/shared/lib/contracts/abi/eip20';
import { defaultAccount$, makeContract$, myBalance$ } from '@parity/light.js';
import { fromWei } from '@parity/api/lib/util/wei';
import { inject } from 'mobx-react';
import light from 'light-hoc';
import { map, switchMap } from 'rxjs/operators';
import PropTypes from 'prop-types';
import { TokenCard } from 'light-ui';
import { withRouter } from 'react-router-dom';

@light({
  balance: ({ token: { address, decimals } }) =>
    address === 'ETH'
      ? myBalance$().pipe(map(value => +fromWei(value)))
      : defaultAccount$().pipe(
        switchMap(defaultAccount =>
          makeContract$(address, abi).balanceOf$(defaultAccount)
        ),
        map(value => +value.div(10 ** decimals))
      )
})
@inject('sendStore')
@withRouter
class TokenBalance extends Component {
  static propTypes = {
    token: PropTypes.object.isRequired
  };

  handleClick = () => {
    const { history, sendStore, token } = this.props;
    if (!token.address) {
      return;
    }
    sendStore.setTokenAddress(token.address);
    history.push('/send');
  };

  render () {
    return <TokenCard onClick={this.handleClick} {...this.props} />;
  }
}

export default TokenBalance;