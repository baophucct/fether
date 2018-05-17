// Copyright 2015-2018 Parity Technologies (UK) Ltd.
// This file is part of Parity.
//
// SPDX-License-Identifier: MIT

import React, { Component } from 'react';
import { balanceOf$, defaultAccount$ } from '@parity/light.js';
import { map, switchMap } from 'rxjs/operators';
import { fromWei, toWei } from '@parity/api/lib/util/wei';

import ethereumIcon from '../assets/img/tokens/ethereum.png';
import light from '../hoc';

@light({
  balance: () =>
    defaultAccount$().pipe(
      switchMap(balanceOf$),
      map(value => +fromWei(value.toString()))
    ),
  me: defaultAccount$
})
class Send extends Component {
  state = {
    amount: 0.01, // In Ether
    gas: 21000,
    to: '0x00Ae02834e91810B223E54ce3f9B7875258a1747'
  };

  handleChangeAmount = ({ target: { value } }) =>
    this.setState({ amount: value });

  handleChangeGas = ({ target: { value } }) => this.setState({ gas: value });

  handleChangeTo = ({ target: { value } }) => this.setState({ to: value });

  handleSubmit = e => {
    e.preventDefault();
    const { history, me } = this.props;
    const { amount, gas, to } = this.state;
    const tx = {
      from: me,
      gas,
      to,
      value: toWei(amount)
    };
    history.push(`/signer`, tx);
  };

  render () {
    const { balance } = this.props;
    const { amount, gas, to } = this.state;

    return (
      <div className='box -well'>
        <div className='box -card'>
          <header className='token -header'>
            <div className='token_icon'>
              <img src={ethereumIcon} alt='ethereum' />
            </div>
            <div className='token_name'>Ethereum</div>
            <div className='token_balance'>
              {balance}
              <span className='token_symbol'>ETH</span>
            </div>
          </header>

          <form className='send-form' onSubmit={this.handleSubmit}>
            <fieldset className='send-form_fields'>
              <div className='send-form_field'>
                <label>Address</label>
                <input onChange={this.handleChangeTo} required value={to} />
              </div>
              <div className='send-form_field'>
                <label>Amount</label>
                <input
                  onChange={this.handleChangeAmount}
                  required
                  type='number'
                  value={amount}
                />
              </div>
              <div className='send-form_field'>
                <label>Gas</label>
                <input
                  onChange={this.handleChangeGas}
                  required
                  type='number'
                  value={gas}
                />
              </div>
            </fieldset>
            <div className='send-form_action'>
              <button className='button'>Send</button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default Send;