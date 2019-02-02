// Libraries
import React, {PureComponent} from 'react'
import {connect} from 'react-redux'
import _ from 'lodash'

// Components
import {ErrorHandling} from 'src/shared/decorators/errors'
import WizardOverlay from 'src/clockface/components/wizard/WizardOverlay'
import CollectorsStepSwitcher from 'src/dataLoaders/components/collectorsWizard/CollectorsStepSwitcher'

// Actions
import {notify as notifyAction} from 'src/shared/actions/notifications'
import {
  setBucketInfo,
  incrementCurrentStepIndex,
  decrementCurrentStepIndex,
  setCurrentStepIndex,
  clearSteps,
} from 'src/dataLoaders/actions/steps'

import {clearDataLoaders} from 'src/dataLoaders/actions/dataLoaders'

// Types
import {Links} from 'src/types/v2/links'
import {Substep, TelegrafPlugin} from 'src/types/v2/dataLoaders'
import {Notification, NotificationFunc} from 'src/types'
import {AppState} from 'src/types/v2'
import {Bucket} from 'src/api'

export interface CollectorsStepProps {
  currentStepIndex: number
  onIncrementCurrentStepIndex: () => void
  onDecrementCurrentStepIndex: () => void
  notify: (message: Notification | NotificationFunc) => void
  onExit: () => void
}

interface OwnProps {
  onCompleteSetup: () => void
  visible: boolean
  buckets: Bucket[]
  startingStep?: number
}

interface DispatchProps {
  notify: (message: Notification | NotificationFunc) => void
  onSetBucketInfo: typeof setBucketInfo
  onIncrementCurrentStepIndex: typeof incrementCurrentStepIndex
  onDecrementCurrentStepIndex: typeof decrementCurrentStepIndex
  onSetCurrentStepIndex: typeof setCurrentStepIndex
  onClearDataLoaders: typeof clearDataLoaders
  onClearSteps: typeof clearSteps
}

interface StateProps {
  links: Links
  telegrafPlugins: TelegrafPlugin[]
  currentStepIndex: number
  substep: Substep
  username: string
  bucket: string
}

type Props = OwnProps & StateProps & DispatchProps

@ErrorHandling
class CollectorsWizard extends PureComponent<Props> {
  public componentDidMount() {
    this.handleSetBucketInfo()
    this.handleSetStartingValues()
  }

  public componentDidUpdate(prevProps: Props) {
    const hasBecomeVisible = !prevProps.visible && this.props.visible

    if (hasBecomeVisible) {
      this.handleSetBucketInfo()
      this.handleSetStartingValues()
    }
  }

  public render() {
    const {visible, buckets, telegrafPlugins} = this.props

    return (
      <WizardOverlay
        visible={visible}
        title={'Create a Telegraf Config'}
        onDismis={this.handleDismiss}
      >
        <div className="wizard-contents">
          <PluginsSideBar
            telegrafPlugins={telegrafPlugins}
            onTabClick={this.handleClickSideBarTab}
            title="Plugins to Configure"
            visible={this.sideBarVisible}
            currentStepIndex={currentStepIndex}
          />
          <div className="wizard-step--container">
            <CollectorsStepSwitcher
              stepProps={this.stepProps}
              buckets={buckets}
            />
          </div>
        </div>
      </WizardOverlay>
    )
  }

  private handleSetBucketInfo = () => {
    const {bucket, buckets} = this.props
    if (!bucket && (buckets && buckets.length)) {
      const {organization, organizationID, name, id} = buckets[0]

      this.props.onSetBucketInfo(organization, organizationID, name, id)
    }
  }

  private handleSetStartingValues = () => {
    const {startingStep} = this.props

    const hasStartingStep = startingStep || startingStep === 0

    if (hasStartingStep) {
      this.props.onSetCurrentStepIndex(startingStep)
    }
  }

  private handleDismiss = () => {
    this.props.onCompleteSetup()
    this.props.onClearDataLoaders()
    this.props.onClearSteps()
  }

  private get sideBarVisible() {
    const {dataLoaders, currentStepIndex} = this.props
    const {telegrafPlugins, type} = dataLoaders

    const isStreaming = type === DataLoaderType.Streaming
    const isNotEmpty = telegrafPlugins.length > 0
    const isConfigStep = currentStepIndex > 0

    return isStreaming && isNotEmpty && isConfigStep
  }

  private handleClickSideBarTab = (tabID: string) => {
    const {
      onSetSubstepIndex,
      onSetActiveTelegrafPlugin,
      dataLoaders: {telegrafPlugins},
      substep,
      onSetPluginConfiguration,
    } = this.props

    if (!_.isNaN(Number(substep))) {
      onSetPluginConfiguration(_.get(telegrafPlugins, `${substep}.name`, ''))
    }

    if (tabID === 'config') {
      onSetSubstepIndex(DataLoaderStep.Configure, tabID)
      onSetActiveTelegrafPlugin('')
      return
    }

    const index = Math.max(
      _.findIndex(telegrafPlugins, plugin => {
        return plugin.name === tabID
      }),
      0
    )

    onSetSubstepIndex(DataLoaderStep.Configure, index)
    onSetActiveTelegrafPlugin(tabID)
  }

  private get stepProps(): CollectorsStepProps {
    const {
      notify,
      currentStepIndex,
      onDecrementCurrentStepIndex,
      onIncrementCurrentStepIndex,
    } = this.props

    return {
      currentStepIndex,
      onIncrementCurrentStepIndex,
      onDecrementCurrentStepIndex,
      notify,
      onExit: this.handleDismiss,
    }
  }
}

const mstp = ({
  links,
  dataLoading: {
    dataLoaders: {telegrafPlugins},
    steps: {currentStep, substep, bucket},
  },
  me: {name},
}: AppState): StateProps => ({
  links,
  telegrafPlugins,
  currentStepIndex: currentStep,
  substep,
  username: name,
  bucket,
})

const mdtp: DispatchProps = {
  notify: notifyAction,
  onSetBucketInfo: setBucketInfo,
  onIncrementCurrentStepIndex: incrementCurrentStepIndex,
  onDecrementCurrentStepIndex: decrementCurrentStepIndex,
  onSetCurrentStepIndex: setCurrentStepIndex,
  onClearDataLoaders: clearDataLoaders,
  onClearSteps: clearSteps,
}

export default connect<StateProps, DispatchProps, OwnProps>(
  mstp,
  mdtp
)(CollectorsWizard)