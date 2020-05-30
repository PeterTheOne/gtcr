import React, { useEffect, useState, useCallback } from 'react'
import { Card, Icon, Tooltip, Form, Switch, Upload, message, Alert } from 'antd'
import { withFormik, Field } from 'formik'
import PropTypes from 'prop-types'
import * as yup from 'yup'
import styled from 'styled-components/macro'
import CustomInput from '../../components/custom-input'
import itemTypes from '../../utils/item-types'
import ipfsPublish from '../../utils/ipfs-publish'
import { sanitize } from '../../utils/string'
import { useWeb3Context } from 'web3-react'
import { useDebounce } from 'use-debounce/lib'
import useNetworkEnvVariable from '../../hooks/network-env'
import useArbitrationCost from '../../hooks/arbitration-cost'
import { getAddress } from 'ethers/utils'
import KlerosParams from './kleros-params'
import BaseDepositInput from '../../components/base-deposit-input'

const StyledUpload = styled(Upload)`
  & > .ant-upload.ant-upload-select-picture-card {
    width: 100%;
  }
`

const StyledAlert = styled(Alert)`
  margin-bottom: 32px;
`

const UploadButton = ({ loading }) => (
  <div>
    <Icon type={loading ? 'loading' : 'plus'} />
    <div className="ant-upload-text">Upload</div>
  </div>
)

UploadButton.propTypes = {
  loading: PropTypes.bool
}

UploadButton.defaultProps = {
  loading: null
}

const RelTCRParams = ({
  handleSubmit,
  formId,
  errors,
  setFieldValue,
  touched,
  defaultArbLabel,
  defaultArbDataLabel,
  defaultGovernorLabel,
  ...rest
}) => {
  const { values, setTcrState } = rest
  const [uploading, setUploading] = useState()
  const [advancedOptions, setAdvancedOptions] = useState()
  const { library, networkId } = useWeb3Context()
  const [debouncedArbitrator] = useDebounce(values.relArbitratorAddress, 1000)
  const {
    arbitrator: klerosAddress,
    policy: policyAddress
  } = useNetworkEnvVariable('REACT_APP_KLEROS_ADDRESSES', networkId)
  const { arbitrationCost } = useArbitrationCost({
    address: values.relArbitratorAddress,
    arbitratorExtraData: values.relArbitratorExtraData,
    library
  })
  const setRelArbitratorExtraData = useCallback(
    val => setFieldValue('relArbitratorExtraData', val),
    [setFieldValue]
  )

  let isKlerosArbitrator
  try {
    isKlerosArbitrator =
      getAddress(debouncedArbitrator) === getAddress(klerosAddress)
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    isKlerosArbitrator = false
  }

  useEffect(() => {
    setTcrState(previousState => ({
      ...previousState,
      ...values
    }))
  }, [values, setTcrState])

  const fileUploadStatusChange = useCallback(({ file: { status } }) => {
    if (status === 'done') message.success(`File uploaded successfully.`)
    else if (status === 'error') message.error(`File upload failed.`)
    else if (status === 'uploading') setUploading(true)

    if (status === 'error' || status === 'done') setUploading(false)
  }, [])

  const customRequest = useCallback(
    fieldName => async ({ file, onSuccess, onError }) => {
      try {
        const data = await new Response(new Blob([file])).arrayBuffer()
        const ipfsFileObj = await ipfsPublish(sanitize(file.name), data)
        const fileURI = `/ipfs/${ipfsFileObj[1].hash}${ipfsFileObj[0].path}`

        setFieldValue(fieldName, fileURI)
        onSuccess('ok', `${process.env.REACT_APP_IPFS_GATEWAY}${fileURI}`)
      } catch (err) {
        console.error(err)
        onError(err)
      }
    },
    [setFieldValue]
  )

  const beforeFileUpload = useCallback(file => {
    const isPDF = file.type === 'application/pdf'
    if (!isPDF) message.error('Please upload file as PDF.')

    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) message.error('File must smaller than 10MB.')

    return isPDF && isLt10M
  }, [])

  return (
    <Card title="Choose the parameters of the Badges list">
      <Form layout="vertical" id={formId} onSubmit={handleSubmit}>
        <BaseDepositInput
          name="relSubmissionBaseDeposit"
          error={errors.relSubmissionBaseDeposit}
          touched={touched.relSubmissionBaseDeposit}
          arbitrationCost={arbitrationCost}
          label={
            <span>
              Submission Deposit&nbsp;
              <Tooltip title="This will be the deposit required to submit connect a badge and also the amount awarded to successful challengers. If the value is too low, people will not look for flaws in the submissions and bad ones could make it through. If it is too high, the list will be secure, but people will be afraid to connect badges so there will be few available badges.">
                <Icon type="question-circle-o" />
              </Tooltip>
            </span>
          }
          {...rest}
        />
        <BaseDepositInput
          name="relRemovalBaseDeposit"
          error={errors.relRemovalBaseDeposit}
          touched={touched.relRemovalBaseDeposit}
          arbitrationCost={arbitrationCost}
          label={
            <span>
              Removal Deposit&nbsp;
              <Tooltip title=" This will be the deposit required to disconnect a badge and also the amount awarded to successful challengers. If the value is too low, people will not look for flaws in removal requests and compliant badges could be disconnected. If it is too high, people will be afraid to remove non compliant badges, so a badge that should not be registerd would stay longer than it should.">
                <Icon type="question-circle-o" />
              </Tooltip>
            </span>
          }
          {...rest}
        />
        <BaseDepositInput
          name="relSubmissionChallengeBaseDeposit"
          error={errors.relSubmissionChallengeBaseDeposit}
          touched={touched.relSubmissionChallengeBaseDeposit}
          arbitrationCost={arbitrationCost}
          label={
            <span>
              Challenge Submission Deposit&nbsp;
              <Tooltip title="This is the deposit required to challenge a submission. It will be either reimbursed to the challenger or awarded to the submitter depending on who wins the dispute.">
                <Icon type="question-circle-o" />
              </Tooltip>
            </span>
          }
          {...rest}
        />
        <BaseDepositInput
          name="relRemovalChallengeBaseDeposit"
          error={errors.relRemovalChallengeBaseDeposit}
          touched={touched.relRemovalChallengeBaseDeposit}
          arbitrationCost={arbitrationCost}
          label={
            <span>
              Challenge Removal Deposit&nbsp;
              <Tooltip title="This is the deposit required to challenge a removal request. It will be either reimbursed to the challenger or awarded to the party that removed the item depending on who wins the dispute.">
                <Icon type="question-circle-o" />
              </Tooltip>
            </span>
          }
          {...rest}
        />
        <CustomInput
          name="relChallengePeriodDuration"
          placeholder="5"
          addonAfter="Hours"
          error={errors.relChallengePeriodDuration}
          touched={touched.relChallengePeriodDuration}
          type={itemTypes.NUMBER}
          step={1}
          label={
            <span>
              Challenge Period Duration (hours)&nbsp;
              <Tooltip title="The length of the challenge period in hours.">
                <Icon type="question-circle-o" />
              </Tooltip>
            </span>
          }
          {...rest}
        />
        <div style={{ marginBottom: '26px' }}>
          <div className="ant-col ant-form-item-label">
            <label htmlFor="rel-primary-document">
              <span>Primary Document&nbsp;</span>
              <Tooltip title="The list primary document defines the acceptance criteria that jurors and prosecutors will use to evaluate submissions. For a Badge list, the primary document should define what lists are considered interesting to the viewers of your list. Use the PDF file format.">
                <Icon type="question-circle-o" />
              </Tooltip>
            </label>
            <br />
            Click{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://ipfs.kleros.io/ipfs/QmbqgkZoGu7jJ8nTqee4NypEhK7YVBEJJmPJbJxz8Bx8nY/t2cr-primary-doc.pdf"
            >
              here
            </a>{' '}
            to view an example of a primary document.
          </div>
          <StyledUpload
            name="rel-primary-document"
            listType="picture-card"
            className="avatar-uploader"
            showUploadList={false}
            customRequest={customRequest('relTcrPrimaryDocument')}
            beforeUpload={beforeFileUpload}
            onChange={fileUploadStatusChange}
          >
            {values.relTcrPrimaryDocument ? (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`${process.env.REACT_APP_IPFS_GATEWAY}${values.relTcrPrimaryDocument}`}
              >
                <Icon type="file-pdf" style={{ fontSize: '30px' }} />
              </a>
            ) : (
              <UploadButton loading={uploading} />
            )}
          </StyledUpload>
        </div>
        <Form.Item
          label="Advanced options"
          style={{ marginBottom: '12px', display: 'flex' }}
        >
          <Switch
            onChange={() => setAdvancedOptions(toggle => !toggle)}
            style={{ marginLeft: '8px' }}
          />
        </Form.Item>
        <CustomInput
          name="relGovernorAddress"
          placeholder="0x7331deadbeef..."
          hasFeedback
          error={errors.relGovernorAddress}
          touched={touched.relGovernorAddress}
          label={
            <span>
              Governor&nbsp;
              <Tooltip
                title={`The address of the governor to use for this list. It can update parameters such as the challenge period duration, deposits, primary document and the list governor. By default it is set to ${defaultGovernorLabel}`}
              >
                <Icon type="question-circle-o" />
              </Tooltip>
            </span>
          }
          {...rest}
        />
        {advancedOptions && (
          <>
            <CustomInput
              name="relArbitratorAddress"
              placeholder="0x7331deadbeef..."
              hasFeedback
              error={errors.relArbitratorAddress}
              touched={touched.relArbitratorAddress}
              label={
                <span>
                  Arbitrator&nbsp;
                  <Tooltip
                    title={`The address of the arbitrator to use for this list. By default it is set to ${defaultArbLabel}.`}
                  >
                    <Icon type="question-circle-o" />
                  </Tooltip>
                </span>
              }
              {...rest}
            />
            {!isKlerosArbitrator && policyAddress ? (
              <CustomInput
                name="relArbitratorExtraData"
                placeholder="0x7331deadbeef..."
                hasFeedback
                error={errors.relArbitratorExtraData}
                touched={touched.relArbitratorExtraData}
                label={
                  <span>
                    Arbitrator Extra Data&nbsp;
                    <Tooltip
                      title={`The extra data for the arbitrator. See ERC 792 for more information. Default: ${defaultArbDataLabel}`}
                    >
                      <Icon type="question-circle-o" />
                    </Tooltip>
                  </span>
                }
                {...rest}
              />
            ) : (
              <KlerosParams
                arbitratorExtraData={values.arbitratorExtraData}
                klerosAddress={debouncedArbitrator}
                policyAddress={policyAddress}
                setArbitratorExtraData={setRelArbitratorExtraData}
              />
            )}
            <StyledAlert
              message="To appeal, in addition to paying enough fees to cover the payment to the jurors in case the appeal is lost, parties must also pay an additional stake. The stake of the side that ultimately loses the dispute is used as the reward given to the appeal fee contributors that funded the side that ultimately wins the dispute. This amount is calculated proportionally to the total juror fees required for appeal using the multipliers below, given in basis points. For example, a multiplier of 1000 will result in the stake being 10% of the total juror fees."
              type="info"
              showIcon
            />
            <StyledAlert
              message="The total cost to fully fund one side of an appeal is: Total Appeal Cost=Total Juror Fees+Total Juror Fees*Stake Multiplier/10000"
              type="info"
              showIcon
            />
            <CustomInput
              name="relSharedStakeMultiplier"
              placeholder="10000"
              error={errors.relSharedStakeMultiplier}
              touched={touched.relSharedStakeMultiplier}
              type={itemTypes.NUMBER}
              label={
                <span>
                  Shared stake multiplier&nbsp;
                  <Tooltip title="This is the multiplier for the stake both parties must pay to fully fund their side of an appeal when there isn't a winner or looser (e.g. when the arbitrator refused to rule). Given in basis points.">
                    <Icon type="question-circle-o" />
                  </Tooltip>
                </span>
              }
              {...rest}
            />
            <CustomInput
              name="relWinnerStakeMultiplier"
              placeholder="10000"
              error={errors.relWinnerStakeMultiplier}
              touched={touched.relWinnerStakeMultiplier}
              type={itemTypes.NUMBER}
              label={
                <span>
                  Winner stake multiplier&nbsp;
                  <Tooltip title="This is the multiplier for the fee stake the winner of a round must pay to fully fund his side of an appeal. Given in basis points.">
                    <Icon type="question-circle-o" />
                  </Tooltip>
                </span>
              }
              {...rest}
            />
            <CustomInput
              name="relLooserStakeMultiplier"
              placeholder="20000"
              error={errors.relLooserStakeMultiplier}
              touched={touched.relLooserStakeMultiplier}
              type={itemTypes.NUMBER}
              label={
                <span>
                  Loser stake multiplier&nbsp;
                  <Tooltip title="This is the multiplier for the fee stake the loser of a round must pay to fully fund his side of an appeal. Given in basis points.">
                    <Icon type="question-circle-o" />
                  </Tooltip>
                </span>
              }
              {...rest}
            />
            <Field name="relRequireRemovalEvidence">
              {({ field }) => (
                <Form.Item
                  label="Require evidence for removing items"
                  style={{ marginBottom: '12px', display: 'flex' }}
                >
                  <Switch
                    onChange={value =>
                      setFieldValue('relRequireRemovalEvidence', value)
                    }
                    style={{ marginLeft: '8px' }}
                    checked={field.value}
                  />
                </Form.Item>
              )}
            </Field>
          </>
        )}
      </Form>
    </Card>
  )
}

RelTCRParams.propTypes = {
  handleSubmit: PropTypes.func.isRequired,
  setFieldValue: PropTypes.func.isRequired,
  formId: PropTypes.string.isRequired,
  errors: PropTypes.objectOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.objectOf(PropTypes.string))
    ])
  ).isRequired,
  touched: PropTypes.objectOf(
    PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.arrayOf(PropTypes.objectOf(PropTypes.bool))
    ])
  ).isRequired,
  defaultArbLabel: PropTypes.string.isRequired,
  defaultArbDataLabel: PropTypes.string.isRequired,
  defaultGovernorLabel: PropTypes.string.isRequired
}

const validationSchema = yup.object().shape({
  relArbitratorAddress: yup
    .string()
    .required('An arbitrator address is required.')
    .max(160, 'Ethereum addresses are 42 characters long.'),
  relArbitratorExtraData: yup
    .string()
    .required('The arbitrator extra data is required.'),
  relGovernorAddress: yup
    .string()
    .required('A governor address is required.')
    .max(160, 'Ethereum addresses are 42 characters long.'),
  relSubmissionBaseDeposit: yup
    .number()
    .typeError('Amount should be a number.')
    .required('A value is required.')
    .min(0, 'The amount must not be negative.'),
  relRemovalBaseDeposit: yup
    .number()
    .typeError('Amount should be a number.')
    .required('A value is required.')
    .min(0, 'The amount must not be negative.'),
  relSubmissionChallengeBaseDeposit: yup
    .number()
    .typeError('Amount should be a number.')
    .required('A value is required.')
    .min(0, 'The amount must not be negative.'),
  relRemovalChallengeBaseDeposit: yup
    .number()
    .typeError('Amount should be a number.')
    .required('A value is required.')
    .min(0, 'The amount must not be negative.'),
  relChallengePeriodDuration: yup
    .number()
    .typeError('Amount should be a number.')
    .required('A value is required.')
    .min(0, 'The amount must not be negative.'),
  relTcrPrimaryDocument: yup
    .string()
    .required('A primary document is required.'),
  relSharedStakeMultiplier: yup
    .number()
    .min(0, 'The stake multiplier cannot be negative.')
    .required('A value is required'),
  relWinnerStakeMultiplier: yup
    .number()
    .min(0, 'The stake multiplier cannot be negative.')
    .required('A value is required'),
  relLooserStakeMultiplier: yup
    .number()
    .min(0, 'The stake multiplier cannot be negative.')
    .required('A value is required')
})

export default withFormik({
  validationSchema,
  mapPropsToValues: ({ tcrState }) => {
    const values = { ...tcrState }
    delete values.transactions
    return values
  },
  handleSubmit: (_, { props: { postSubmit } }) => {
    postSubmit()
  }
})(RelTCRParams)
