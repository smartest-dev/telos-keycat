import React, { useState, useEffect } from 'react'
import { useStore } from '../../store/store'
import { Link, navigate } from '@reach/router'
import Submit from 'design/moles/fields/Submit'
import CardLayout from 'design/layouts/CardLayout'
import { Fields } from 'design/atoms/Input'
import SpinnerField from 'design/moles/fields/SpinnerField'
import { Form } from 'design/moles/form/Form'
import ReCAPTCHA from 'react-google-recaptcha'
import { appendSearchParamsToUrl } from 'utils'
import axios from 'axios'
import { useBlockchain } from '../../hooks/blockchainHooks'
import InputError from '../../design/moles/fields/InputError'
import styled from 'styled-components'
import { Button } from 'design/atoms/Button'

const Container = styled.div`
  margin-bottom: var(--padding-x);
  padding: 0 var(--padding-x);
  flex: 1 1;
  display: flex;
  justify-content: normal;
  align-items: flex-end;
`

const ButtonWrapper = styled.div`
  width: 100%;
  display: grid;
  grid-gap: 20px;
  grid-auto-flow: column;
  align-items: center;
  font-size: 15px;

  button {
    width: 100%;
  }
`

const SecondaryButton = styled(Button)`
  &&& {
    color: var(--primary-color);
    border: 1px solid var(--primary-color);
    background: white;
  }
`

const CreateAccount = props => {
  const plugin = useBlockchain()
  const [isValid, setIsValid] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [errors, setErrors] = useState({})
  const [accountHandle, setAccountHandle] = useState('')
  const [recaptchaValue, setRecaptchaValue] = useState('')
  const [keys, setKeys] = useState(null)
  const store = useStore()
  const {
    config: {
      blockchain: { nodes, name },
    },
  } = store

  const onClickSignin = () => {
    navigate(appendSearchParamsToUrl('/signin'))
  }

  const onChangeRecaptcha = value => {
    setRecaptchaValue(value)
  }

  const fetchHandleAvailability = async () => {
    let url
    if (name === 'telos') {
      url = 'api.telos.net'
    } else if (name === 'telos-testnet') {
      url = 'api-dev.telos.net'
    } else {
      throw new Error('Invalid blockchain name')
    }
    console.log('fetching handle: ', accountHandle)
    try {
      const handleAvailabilityResponse = await axios({
        url: `https://${url}/v1/accounts/${accountHandle.toLowerCase()}`,
      })
      if (handleAvailabilityResponse.data === 204) {
        setIsAvailable(true)
      }
    } catch (error) {
      console.log('error case, error: ', error)
      if (error.response.status === 400) {
        setErrors({
          accountHandle: {
            message: 'Account handle unavailable, please try another',
            name: 'CreateAccountError',
          },
        })
      }
    } finally {
      setIsCheckingAvailability(false)
    }
  }

  useEffect(() => {
    if (accountHandle && isValid) {
      setIsCheckingAvailability(true)
      const timer = setTimeout(fetchHandleAvailability, 500)
      return () => clearTimeout(timer)
    }
  }, [accountHandle])

  const onChangeAccountHandle = (e: any) => {
    setErrors({})
    const newAccountHandle = e.target.value
    const regexPattern = new RegExp(/^[a-z1-5]+$/i)
    if (newAccountHandle.length !== 12 || !regexPattern.test(newAccountHandle)) {
      setErrors({
        accountHandle: {
          message: 'Invalid account handle. Must be 12 characters long, alphabetical, or 1-5',
          name: 'CreateAccountError',
        },
      })
      setIsAvailable(false) // for now assume invalid handles unavailable
      setIsValid(false)
    } else {
      setIsValid(true)
    }
    setAccountHandle(newAccountHandle)
  }

  useEffect(() => {
    generateKeys()
  }, [])

  const generateKeys = async () => {
    const blockchain = await plugin.wait()
    const newKeys = await blockchain.getNewKeyPair()
    setKeys({
      activeKeys: newKeys,
      ownerKeys: newKeys,
    })
  }

  const onClickSubmit = async ({ values }) => {
    const lowerCaseAccountHandle = accountHandle.toLowerCase()
    setIsCreatingAccount(true)
    let url
    if (name === 'telos') {
      url = 'api.telos.net'
    } else if (name === 'telos-testnet') {
      url = 'api-dev.telos.net'
    } else {
      throw new Error('Invalid blockchain name')
    }
    let createAccountResponse
    try {
      createAccountResponse = await fetch(`https://${url}/v1/recaptchaCreate`, {
        method: 'POST',
        body: JSON.stringify({
          recaptchaResponse: recaptchaValue,
          accountName: lowerCaseAccountHandle,
          ownerKey: keys.ownerKeys.publicKey,
          activeKey: keys.activeKeys.publicKey,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const createAccountData = await createAccountResponse.json()
      if (!createAccountResponse.ok) {
        setErrors({
          accountHandle: {
            message: createAccountData.message,
            name: 'CreateAccountError',
          },
        })
        return
      }
      navigate('/review', { state: { accountHandle: lowerCaseAccountHandle, keys } })
    } catch (error) {
      console.log('in catch and error is: ', JSON.stringify(error.message))
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const isSubmitDisabled = isCheckingAvailability || isCreatingAccount || !isValid || !isAvailable || !recaptchaValue
  const chainSyntax = name === 'telos' ? 'Telos' : 'Telos Testnet'

  return (
    <CardLayout title={`Create ${chainSyntax} Account`}>
      <Fields>
        <SpinnerField onChange={onChangeAccountHandle} isLoading={isCheckingAvailability} name={'accountHandle'} />
        <InputError message={errors.accountHandle && errors.accountHandle.message} />
      </Fields>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 18,
          marginBottom: 18,
        }}
      >
        <ReCAPTCHA sitekey="6Ld-_eIZAAAAAF6JsrFudo_uQjRL4eqPAZE40I3o" onChange={onChangeRecaptcha} />
      </div>
      <Submit
        disabled={isSubmitDisabled}
        sibling={() => <Link to={appendSearchParamsToUrl('/register')}>Import Account</Link>}
        onClick={onClickSubmit}
      >
        {isCreatingAccount ? <i className={'loader loading'}></i> : 'Create'}
      </Submit>
      <Container>
        <div style={{ width: '100%' }}>
          <ButtonWrapper>
            <SecondaryButton className="secondaryButton" type="submit" onClick={onClickSignin}>
              Sign in
            </SecondaryButton>
          </ButtonWrapper>
        </div>
      </Container>
    </CardLayout>
  )
}

export default CreateAccount
