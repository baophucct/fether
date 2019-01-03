// Copyright 2015-2018 Parity Technologies (UK) Ltd.
// This file is part of Parity.
//
// SPDX-License-Identifier: BSD-3-Clause

import React, { Component } from 'react';
import BigNumber from 'bignumber.js';
import createDecorator from 'final-form-calculate';
import debounce from 'debounce-promise';
import { Field, Form } from 'react-final-form';
import { Form as FetherForm, Header } from 'fether-ui';
import { fromWei, toWei } from '@parity/api/lib/util/wei';
import { inject, observer } from 'mobx-react';
import { isAddress } from '@parity/api/lib/util/address';
import { Link } from 'react-router-dom';
import { OnChange } from 'react-final-form-listeners';
import { withProps } from 'recompose';

import { estimateGas } from '../../utils/estimateGas';
import RequireHealth from '../../RequireHealthOverlay';
import TokenBalance from '../../Tokens/TokensList/TokenBalance';
import withAccount from '../../utils/withAccount.js';
import withBalance, { withEthBalance } from '../../utils/withBalance';
import withHealth from '../../utils/withHealth';
import withTokens from '../../utils/withTokens';

const MAX_GAS_PRICE = 40; // In Gwei
const MIN_GAS_PRICE = 3; // Safelow gas price from GasStation, in Gwei

@inject('parityStore', 'sendStore')
@withHealth
@withTokens
@withProps(({ match: { params: { tokenAddress } }, tokens }) => ({
  token: tokens[tokenAddress]
}))
@withAccount
@withBalance // Balance of current token (can be ETH)
@withEthBalance // ETH balance
@observer
class Send extends Component {
  state = {
    maxSelected: false,
    form: {
      amount: '',
      gasPrice: '4',
      to: ''
    }
  };

  handleSubmit = values => {
    const { accountAddress, history, sendStore, token } = this.props;

    sendStore.setTx(values);
    history.push(`/send/${token.address}/from/${accountAddress}/signer`);
  };

  decorator = createDecorator({
    field: /to|amount/, // when the value of these fields change...
    updates: {
      // ...set field "gas"
      gas: (value, allValues) => {
        const { parityStore, token } = this.props;
        if (this.preValidate(allValues) === true) {
          return estimateGas(allValues, token, parityStore.api);
        } else {
          return null;
        }
      }
    }
  });

  calculateMax = (gas, gasPrice) => {
    const { token, balance } = this.props;
    const gasBn = gas ? new BigNumber(gas) : new BigNumber(21000);
    const gasPriceBn = new BigNumber(gasPrice);
    let output;

    if (token.address === 'ETH') {
      output = fromWei(
        toWei(balance).minus(gasBn.multipliedBy(toWei(gasPriceBn, 'shannon')))
      );
      output = output.isNegative() ? new BigNumber(0) : output;
    } else {
      output = balance;
    }
    return output;
  };

  onChangeAmount = fieldValue => {
    const {
      form: { gasPrice, to }
    } = this.state;

    this.setState({ form: { amount: fieldValue, gasPrice, to } });

    return fieldValue;
  };

  onChangeGasPrice = fieldValue => {
    const {
      form: { amount, to }
    } = this.state;

    this.setState({ form: { amount, gasPrice: fieldValue, to } });

    return fieldValue;
  };

  onChangeTo = fieldValue => {
    const {
      form: { amount, gasPrice }
    } = this.state;

    this.setState({ form: { amount, gasPrice, to: fieldValue } });

    return fieldValue;
  };

  recalculateMax = (args, state, { changeValue }) => {
    changeValue(state, 'amount', value => {
      const max = this.calculateMax(
        state.formState.values.gas,
        state.formState.values.gasPrice
      );

      this.onChangeAmount(max);

      return max;
    });
  };

  toggleMax = () => {
    this.setState({ maxSelected: !this.state.maxSelected });
  };

  render () {
    const {
      accountAddress,
      sendStore: { tx },
      token
    } = this.props;

    console.log('this.props: ', this.props);

    const {
      form: { amount, gasPrice, to }
    } = this.state;

    return (
      <div>
        <Header
          left={
            <Link to={`/tokens/${accountAddress}`} className='icon -back'>
              Close
            </Link>
          }
          title={token && <h1>Send {token.name}</h1>}
        />

        <RequireHealth require='sync'>
          <div className='window_content'>
            <div className='box -padded'>
              <TokenBalance
                decimals={6}
                drawers={[
                  <Form
                    key='txForm'
                    initialValues={{
                      amount,
                      from: accountAddress,
                      gasPrice,
                      to,
                      ...tx
                    }}
                    onSubmit={this.handleSubmit}
                    validate={this.validateForm}
                    decorators={[this.decorator]}
                    mutators={{ recalculateMax: this.recalculateMax }}
                    render={({
                      handleSubmit,
                      valid,
                      validating,
                      values,
                      form: { mutators }
                    }) => (
                      <form className='send-form' onSubmit={handleSubmit}>
                        <fieldset className='form_fields'>
                          <Field
                            className='form_field_amount'
                            formNoValidate
                            label='Amount'
                            name='amount'
                            disabled={this.state.maxSelected}
                            parse={this.onChangeAmount}
                            placeholder='0.00'
                            render={FetherForm.Field}
                            required
                            type='number'
                          >
                            <button
                              type='button'
                              className={
                                this.state.maxSelected
                                  ? 'button -tiny active max'
                                  : 'button -tiny max'
                              }
                              onClick={() => {
                                this.toggleMax();
                                mutators.recalculateMax();
                              }}
                            >
                              Max
                            </button>
                          </Field>

                          <Field
                            as='textarea'
                            className='-sm'
                            label='To'
                            name='to'
                            parse={this.onChangeTo}
                            placeholder='0x...'
                            required
                            render={FetherForm.Field}
                          />

                          <Field
                            centerText={`${values.gasPrice} GWEI`}
                            className='-range'
                            label='Transaction Speed'
                            leftText='Low'
                            max={MAX_GAS_PRICE}
                            min={MIN_GAS_PRICE}
                            name='gasPrice'
                            parse={this.onChangeGasPrice}
                            render={FetherForm.Slider}
                            required
                            rightText='High'
                            step={0.5}
                            type='range' // In Gwei
                          />

                          <OnChange name='gasPrice'>
                            {(value, previous) => {
                              if (this.state.maxSelected) {
                                mutators.recalculateMax();
                              }
                            }}
                          </OnChange>

                          {values.to === values.from && (
                            <span>
                              <h3>WARNING:</h3>
                              <p>
                                The sender and receiver addresses are the same.
                              </p>
                            </span>
                          )}
                        </fieldset>
                        <nav className='form-nav'>
                          <button
                            disabled={!valid || validating}
                            className='button'
                          >
                            {validating ? 'Checking...' : 'Send'}
                          </button>
                        </nav>
                      </form>
                    )}
                  />
                ]}
                onClick={null} // To disable cursor:pointer on card // TODO Can this be done better?
                token={token}
              />
            </div>
          </div>
        </RequireHealth>
      </div>
    );
  }

  preValidate = values => {
    const { balance, token } = this.props;

    if (!values.amount) {
      return { amount: 'Please enter a valid amount' };
    }

    const amountBn = new BigNumber(values.amount.toString());

    if (amountBn.isNaN()) {
      return { amount: 'Please enter a valid amount' };
    } else if (amountBn.isZero()) {
      if (this.state.maxSelected) {
        return { amount: 'ETH balance too low to pay for gas.' };
      }
      return { amount: 'Please enter a non-zero amount' };
    } else if (amountBn.isNegative()) {
      return { amount: 'Please enter a positive amount' };
    } else if (token.address === 'ETH' && toWei(values.amount).lt(1)) {
      return { amount: 'Please enter at least 1 Wei' };
    } else if (amountBn.dp() > token.decimals) {
      return {
        amount: `Please enter a ${token.name} value of less than ${
          token.decimals
        } decimal places`
      };
    } else if (balance && balance.lt(amountBn)) {
      return { amount: `You don't have enough ${token.symbol} balance` };
    } else if (!values.to || !isAddress(values.to)) {
      return { to: 'Please enter a valid Ethereum address' };
    } else if (values.to === '0x0000000000000000000000000000000000000000') {
      return {
        to: `You are not permitted to send ${
          token.name
        } to the zero account (0x0)`
      };
    }
    return true;
  };

  /**
   * Estimate gas amount, and validate that the user has enough balance to make
   * the tx.
   */
  validateForm = debounce(values => {
    try {
      const { ethBalance, token } = this.props;

      const preValidation = this.preValidate(values);
      // preValidate return an error if a field isn't valid
      if (preValidation !== true) {
        return preValidation;
      }

      // If the gas hasn't been calculated yet, then we don't show any errors,
      // just wait a bit more
      if (!values.gas) {
        return;
      }

      if (!ethBalance || isNaN(values.gas)) {
        throw new Error('No "ethBalance" or "gas" value.');
      }

      // Verify that `gas + (eth amount if sending eth) <= ethBalance`
      if (
        values.gas
          .multipliedBy(toWei(values.gasPrice, 'shannon'))
          .plus(token.address === 'ETH' ? toWei(values.amount) : 0)
          .gt(toWei(ethBalance))
      ) {
        return token.address !== 'ETH'
          ? { amount: 'ETH balance too low to pay for gas' }
          : { amount: "You don't have enough ETH balance" };
      }
    } catch (err) {
      console.error(err);
      return {
        amount: 'Failed estimating balance, please try again'
      };
    }
  }, 1000);
}

export default Send;
