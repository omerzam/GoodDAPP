// @flow
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Dimensions, Easing, Image, Platform, TouchableOpacity, View } from 'react-native'
import { get } from 'lodash'
import type { Store } from 'undux'
import { last } from 'rxjs/operators'
import AsyncStorage from '../../lib/utils/asyncStorage'
import { isBrowser } from '../../lib/utils/platform'
import normalize from '../../lib/utils/normalizeText'
import GDStore from '../../lib/undux/GDStore'
import API from '../../lib/API/api'
import SimpleStore, { assertStore } from '../../lib/undux/SimpleStore'
import { useDialog, useErrorDialog } from '../../lib/undux/utils/dialog'
import { weiToMask } from '../../lib/wallet/utils'
import { initBGFetch } from '../../lib/notifications/backgroundFetch'

import { createStackNavigator } from '../appNavigation/stackNavigation'
import { initTransferEvents } from '../../lib/undux/utils/account'

import userStorage from '../../lib/gundb/UserStorage'
import goodWallet from '../../lib/wallet/GoodWallet'
import useAppState from '../../lib/hooks/useAppState'
import { PushButton } from '../appNavigation/PushButton'
import TabsView from '../appNavigation/TabsView'
import BigGoodDollar from '../common/view/BigGoodDollar'
import ClaimButton from '../common/buttons/ClaimButton'
import Section from '../common/layout/Section'
import Wrapper from '../common/layout/Wrapper'
import logger from '../../lib/logger/pino-logger'
import { Statistics, Support } from '../webView/webViewInstances'
import { withStyles } from '../../lib/styles'
import Mnemonics from '../signin/Mnemonics'
import useDeleteAccountDialog from '../../lib/hooks/useDeleteAccountDialog'
import { getMaxDeviceWidth, measure } from '../../lib/utils/sizes'
import { theme as _theme } from '../theme/styles'
import UnknownProfileSVG from '../../assets/unknownProfile.svg'
import useOnPress from '../../lib/hooks/useOnPress'
import Invite from '../invite/Invite'
import useDebounce from '../../lib/hooks/useDebounce'
import { PAGE_SIZE } from './utils/feed'
import PrivacyPolicyAndTerms from './PrivacyPolicyAndTerms'
import Amount from './Amount'
import Claim from './Claim'
import FeedList from './FeedList'
import FeedModalList from './FeedModalList'
import OutOfGasError from './OutOfGasError'
import Reason from './Reason'
import Receive from './Receive'
import HandlePaymentLink from './HandlePaymentLink'

// import MagicLinkInfo from './MagicLinkInfo'
import Who from './Who'
import ReceiveSummary from './ReceiveSummary'
import ReceiveToAddress from './ReceiveToAddress'
import TransactionConfirmation from './TransactionConfirmation'
import SendToAddress from './SendToAddress'
import SendByQR from './SendByQR'
import SendLinkSummary from './SendLinkSummary'
import SendQRSummary from './SendQRSummary'
import { ACTION_SEND } from './utils/sendReceiveFlow'

import FaceVerification from './FaceVerification/screens/VerificationScreen'
import FaceVerificationIntro from './FaceVerification/screens/IntroScreen'
import FaceVerificationError from './FaceVerification/screens/ErrorScreen'

import GoodMarketButton from './GoodMarket/components/GoodMarketButton'
import usePaginatedFeed from './utils/usePaginatedFeed'

const log = logger.child({ from: 'Dashboard' })

let didRender = false
const screenWidth = getMaxDeviceWidth()
const initialHeaderContentWidth = screenWidth - _theme.sizes.default * 2 * 2
const initialAvatarLeftPosition = -initialHeaderContentWidth / 2 + 34

export type DashboardProps = {
  navigation: any,
  screenProps: any,
  store: Store,
  styles?: any,
}

const Dashboard = props => {
  const balanceRef = useRef()
  const { screenProps, styles, theme, navigation }: DashboardProps = props
  const [balanceBlockWidth, setBalanceBlockWidth] = useState(70)
  const [headerContentWidth, setHeaderContentWidth] = useState(initialHeaderContentWidth)
  const [headerHeightAnimValue] = useState(new Animated.Value(176))
  const [headerAvatarAnimValue] = useState(new Animated.Value(68))
  const [headerAvatarLeftAnimValue] = useState(new Animated.Value(0))
  const [headerBalanceBottomAnimValue] = useState(new Animated.Value(0))
  const [avatarCenteredPosition, setAvatarCenteredPosition] = useState(0)
  const [headerBalanceRightMarginAnimValue] = useState(new Animated.Value(0))
  const [headerBalanceLeftMarginAnimValue] = useState(new Animated.Value(0))
  const [headerFullNameOpacityAnimValue] = useState(new Animated.Value(1))
  const store = SimpleStore.useStore()
  const gdstore = GDStore.useStore()
  const [showDialog] = useDialog()
  const [showErrorDialog] = useErrorDialog()
  const showDeleteAccountDialog = useDeleteAccountDialog({ API, showErrorDialog, store, theme })
  const [update, setUpdate] = useState(0)
  const [showDelayedTimer, setShowDelayedTimer] = useState()
  const currentFeed = store.get('currentFeed')
  const currentScreen = store.get('currentScreen')
  const loadingIndicator = store.get('loadingIndicator')
  const loadAnimShown = store.get('feedLoadAnimShown')
  const { balance, entitlement } = gdstore.get('account')
  const { avatar, fullName } = gdstore.get('profile')
  const [headerLarge, setHeaderLarge] = useState(true)
  const { appState } = useAppState()
  const [animateMarket, setAnimateMarket] = useState(false)

  const headerAnimateStyles = {
    position: 'relative',
    height: headerHeightAnimValue,
  }

  const fullNameAnimateStyles = {
    opacity: headerFullNameOpacityAnimValue,
  }

  const avatarAnimStyles = {
    height: headerAvatarAnimValue,
    width: headerAvatarAnimValue,
    left: headerAvatarLeftAnimValue,
  }

  const balanceAnimStyles = {
    bottom: headerBalanceBottomAnimValue,
    marginRight: headerBalanceRightMarginAnimValue,
    marginLeft: Platform.select({
      android: headerLarge ? 0 : 'auto',
      default: headerBalanceLeftMarginAnimValue,
    }),
  }

  const calculateHeaderLayoutSizes = useCallback(() => {
    const newScreenWidth = getMaxDeviceWidth()
    const newHeaderContentWidth = newScreenWidth - _theme.sizes.default * 2 * 2
    const newAvatarCenteredPosition = newHeaderContentWidth / 2 - 34

    setHeaderContentWidth(newHeaderContentWidth)
    setAvatarCenteredPosition(newAvatarCenteredPosition)
  }, [setHeaderContentWidth, setAvatarCenteredPosition])

  const handleDeleteRedirect = useCallback(() => {
    if (navigation.state.key === 'Delete') {
      showDeleteAccountDialog()
    }
  }, [navigation, showDeleteAccountDialog])

  // usePaginatedFeed hook calls it when reset=true only
  const [feeds, feedLoaded, subscribeToFeed, nextFeed] = usePaginatedFeed(log)

  const handleFeedEvent = () => {
    const { params } = navigation.state || {}

    log.debug('handle event effect dashboard', { params })
    if (!params) {
      return
    }

    const { event } = params
    if (event) {
      showNewFeedEvent(params)
    }
  }

  const claimAnimValue = useRef(new Animated.Value(1)).current

  const claimScale = useRef({
    transform: [
      {
        scale: claimAnimValue,
      },
    ],
  }).current

  useEffect(() => {
    if (feedLoaded && appState === 'active') {
      animateItems()
    }
  }, [appState, feedLoaded])

  useEffect(() => {
    if (feedLoaded) {
      log.debug('initDashboard subscribed to feed')
    }
  }, [feedLoaded])

  useEffect(() => {
    if (feedLoaded) {
      log.debug('onFeedLoaded:', { loadAnimShown, didRender })
    }

    if (!feedLoaded || didRender || !feeds || feeds.length <= 0) {
      return
    }

    store.set('feedLoadAnimShown')(true)
    didRender = true
  }, [feedLoaded, feeds, store])

  const animateClaim = useCallback(async () => {
    const inQueue = await userStorage.userProperties.get('claimQueueAdded')

    if (inQueue && inQueue.status === 'pending') {
      return
    }

    const entitlement = await goodWallet
      .checkEntitlement()
      .then(_ => _.toNumber())
      .catch(e => 0)

    if (!entitlement) {
      return
    }

    return new Promise(resolve =>
      Animated.sequence([
        Animated.timing(claimAnimValue, {
          toValue: 1.4,
          duration: 750,
          easing: Easing.ease,
          delay: 1000,
        }),
        Animated.timing(claimAnimValue, {
          toValue: 1,
          duration: 750,
          easing: Easing.ease,
        }),
      ]).start(resolve),
    )
  }, [])

  const animateItems = useCallback(async () => {
    await animateClaim()
    setAnimateMarket(true)
  }, [animateClaim, setAnimateMarket])

  const showDelayed = useCallback(() => {
    if (!assertStore(store, log, 'Failed to show AddWebApp modal')) {
      return
    }

    const id = setTimeout(() => {
      //wait until not loading and not showing other modal (see use effect)
      //mark as displayed
      setShowDelayedTimer(true)
      store.set('addWebApp')({ show: true })
    }, 2000)
    setShowDelayedTimer(id)
  }, [setShowDelayedTimer, store])

  /**
   * rerender on screen size change
   */

  const onResize = useCallback(() => {
    setUpdate(Date.now())
    calculateHeaderLayoutSizes()
  }, [setUpdate])

  const handleResize = useDebounce(onResize, { delay: 100 })

  const initDashboard = async () => {
    await userStorage.initFeed()
    await handleFeedEvent()
    handleDeleteRedirect()
    subscribeToFeed()

    // setTimeout(animateItems, marketAnimationDuration)
    initTransferEvents(gdstore)

    // InteractionManager.runAfterInteractions(handleFeedEvent)
    Dimensions.addEventListener('change', handleResize)

    initBGFetch()
  }

  useEffect(() => {
    saveBalanceBlockWidth()
  }, [balance])

  // The width of the balance block required to calculate its left margin when collapsing the header
  // The balance always changes so the width is dynamical.
  // Animation functionality requires positioning props to be set with numbers.
  const saveBalanceBlockWidth = useCallback(async () => {
    const { current: balanceView } = balanceRef

    if (!balanceView) {
      return
    }

    const measurements = await measure(balanceView)

    // Android never gets values from measure causing animation to crash because of NaN
    const width = measurements.width || 0

    setBalanceBlockWidth(width)
  }, [setBalanceBlockWidth])

  useEffect(() => {
    const timing = 250
    const fullNameOpacityTiming = 150
    const easingIn = Easing.in(Easing.quad)
    const easingOut = Easing.out(Easing.quad)

    // calculate left margin for aligning the balance to the right
    // - 20 is to give more space to the number, otherwise (in native) it gets cut on the right side
    const balanceCalculatedLeftMargin = headerContentWidth - balanceBlockWidth - 20

    if (headerLarge) {
      Animated.parallel([
        Animated.timing(headerAvatarAnimValue, {
          toValue: 68,
          duration: timing,
          easing: easingOut,
        }),
        Animated.timing(headerHeightAnimValue, {
          toValue: 176,
          duration: timing,
          easing: easingOut,
        }),
        Animated.timing(headerAvatarLeftAnimValue, {
          toValue: 0,
          duration: timing,
          easing: easingOut,
        }),
        Animated.timing(headerFullNameOpacityAnimValue, {
          toValue: 1,
          duration: fullNameOpacityTiming,
          easing: easingOut,
        }),
        Animated.timing(headerBalanceBottomAnimValue, {
          toValue: 0,
          duration: timing,
          easing: easingOut,
        }),
        Animated.timing(headerBalanceRightMarginAnimValue, {
          toValue: 0,
          duration: timing,
          easing: easingOut,
        }),
        Animated.timing(headerBalanceLeftMarginAnimValue, {
          toValue: 0,
          duration: timing,
          easing: easingOut,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(headerAvatarAnimValue, {
          toValue: 42,
          duration: timing,
          easing: easingIn,
        }),
        Animated.timing(headerHeightAnimValue, {
          toValue: 40,
          duration: timing,
          easing: easingIn,
        }),
        Animated.timing(headerAvatarLeftAnimValue, {
          toValue: initialAvatarLeftPosition,
          duration: timing,
          easing: easingIn,
        }),
        Animated.timing(headerFullNameOpacityAnimValue, {
          toValue: 0,
          duration: fullNameOpacityTiming,
          easing: easingIn,
        }),
        Animated.timing(headerBalanceBottomAnimValue, {
          toValue: Platform.select({ web: 68, default: 60 }),
          duration: timing,
          easing: easingIn,
        }),
        Animated.timing(headerBalanceRightMarginAnimValue, {
          toValue: 24,
          duration: timing,
          easing: easingIn,
        }),
        Animated.timing(headerBalanceLeftMarginAnimValue, {
          toValue: balanceCalculatedLeftMargin,
          duration: timing,
          easing: easingIn,
        }),
      ]).start()
    }
  }, [headerLarge, balance, update, avatarCenteredPosition, headerContentWidth, balanceBlockWidth])

  useEffect(() => {
    log.debug('Dashboard didmount', navigation)
    initDashboard()

    return () => {
      Dimensions.removeEventListener('change', handleResize)
    }
  }, [])

  /**
   * don't show delayed items such as add to home popup if some other dialog is showing
   */
  useEffect(() => {
    const showingSomething = get(currentScreen, 'dialogData.visible') || get(loadingIndicator, 'loading') || currentFeed

    if (showDelayedTimer !== true && showDelayedTimer && showingSomething) {
      setShowDelayedTimer(clearTimeout(showDelayedTimer))
    } else if (!showDelayedTimer) {
      showDelayed()
    }
  }, [get(currentScreen, 'dialogData.visible'), get(loadingIndicator, 'loading'), currentFeed])

  const showEventModal = useCallback(
    currentFeed => {
      store.set('currentFeed')(currentFeed)
    },
    [store],
  )

  const getNotificationItem = async () => {
    const notificationOpened = await AsyncStorage.getItem('GD_NOTIFICATION_OPENED')
    if (notificationOpened) {
      const item = feeds.find(feed => feed.id === notificationOpened)
      handleFeedSelection(item, true)
      return AsyncStorage.removeItem('GD_NOTIFICATION_OPENED')
    }
  }

  useEffect(() => {
    if (feeds.length) {
      getNotificationItem()
    }
  }, [feeds, appState])

  const handleFeedSelection = (receipt, horizontal) => {
    showEventModal(horizontal ? receipt : null)
  }

  const showNewFeedEvent = useCallback(
    eventId =>
      userStorage.userFeed
        .getFormatedEventById(eventId)
        .pipe(last())
        .subscribe(
          item => {
            log.info('showNewFeedEvent', { eventId, item })
            showEventModal(item)
          },
          error =>
            showDialog({
              title: 'Error',
              message: 'Event does not exist',
            }),
        ),
    [showDialog, showEventModal],
  )

  const onScroll = useCallback(
    ({ nativeEvent }) => {
      const minScrollRequired = 150
      const scrollPosition = nativeEvent.contentOffset.y
      const minScrollRequiredISH = headerLarge ? minScrollRequired : minScrollRequired * 2
      const scrollPositionISH = headerLarge ? scrollPosition : scrollPosition + minScrollRequired
      if (feeds && feeds.length && feeds.length > 10 && scrollPositionISH > minScrollRequiredISH) {
        if (headerLarge) {
          setHeaderLarge(false)
        }
      } else {
        if (!headerLarge) {
          setHeaderLarge(true)
        }
      }
    },
    [headerLarge, feeds, setHeaderLarge],
  )

  const modalListData = useMemo(() => (isBrowser ? [currentFeed] : feeds), [currentFeed, feeds])

  const goToProfile = useOnPress(() => screenProps.push('Profile'), [screenProps])

  return (
    <Wrapper style={styles.dashboardWrapper} withGradient={false}>
      <Section style={[styles.topInfo]}>
        <Animated.View style={headerAnimateStyles}>
          <Section.Stack alignItems="center" style={styles.headerWrapper}>
            <Animated.View style={avatarAnimStyles}>
              <TouchableOpacity onPress={goToProfile} style={styles.avatarWrapper}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatar}>
                    <UnknownProfileSVG />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={[styles.headerFullName, fullNameAnimateStyles]}>
              <Section.Text color="gray80Percent" fontFamily="slab" fontSize={18}>
                {fullName || ' '}
              </Section.Text>
            </Animated.View>
            <Animated.View style={[styles.bigNumberWrapper, balanceAnimStyles]}>
              <View ref={balanceRef}>
                <BigGoodDollar
                  testID="amount_value"
                  number={balance}
                  bigNumberProps={{
                    fontSize: 42,
                    fontWeight: 'semibold',
                    lineHeight: 42,
                    textAlign: 'left',
                  }}
                  bigNumberUnitStyles={styles.bigNumberUnitStyles}
                />
              </View>
            </Animated.View>
          </Section.Stack>
        </Animated.View>
        <Section.Row style={styles.buttonsRow}>
          <PushButton
            icon="send"
            iconAlignment="left"
            routeName="Amount"
            iconSize={20}
            screenProps={screenProps}
            style={styles.leftButton}
            contentStyle={styles.leftButtonContent}
            textStyle={styles.leftButtonText}
            params={{
              action: 'Send',
            }}
            compact
          >
            Send
          </PushButton>
          <ClaimButton
            screenProps={screenProps}
            amount={weiToMask(entitlement, { showUnits: true })}
            animated
            animatedScale={claimScale}
          />
          <PushButton
            icon="receive"
            iconSize={20}
            iconAlignment="right"
            routeName={'Receive'}
            screenProps={screenProps}
            style={styles.rightButton}
            contentStyle={styles.rightButtonContent}
            textStyle={styles.rightButtonText}
            compact
          >
            Receive
          </PushButton>
        </Section.Row>
      </Section>
      <FeedList
        data={feeds}
        handleFeedSelection={handleFeedSelection}
        initialNumToRender={PAGE_SIZE}
        onEndReached={nextFeed} // How far from the end the bottom edge of the list must be from the end of the content to trigger the onEndReached callback.
        // we can use decimal (from 0 to 1) or integer numbers. Integer - it is a pixels from the end. Decimal it is the percentage from the end
        onEndReachedThreshold={0.7} // Determines the maximum number of items rendered outside of the visible area
        windowSize={7}
        onScroll={onScroll}
        headerLarge={headerLarge}
        scrollEventThrottle={100}
      />
      {currentFeed && (
        <FeedModalList
          data={modalListData}
          handleFeedSelection={handleFeedSelection}
          onEndReached={nextFeed}
          selectedFeed={currentFeed}
          navigation={navigation}
        />
      )}
      {animateMarket && <GoodMarketButton />}
    </Wrapper>
  )
}

const getStylesFromProps = ({ theme }) => ({
  headerWrapper: {
    height: '100%',
    paddingBottom: Platform.select({
      web: theme.sizes.defaultDouble,
      default: theme.sizes.default,
    }),
  },
  headerFullName: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  dashboardWrapper: {
    backgroundColor: theme.colors.lightGray,
    flexGrow: 1,
    padding: 0,
    ...Platform.select({
      web: { overflowY: 'hidden' },
    }),
  },
  topInfo: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginLeft: theme.sizes.default,
    marginRight: theme.sizes.default,
    paddingBottom: 6,
    paddingLeft: theme.sizes.default,
    paddingRight: theme.sizes.default,
    paddingTop: theme.sizes.defaultDouble,
    marginBottom: -3,
    zIndex: 10,
    position: 'relative',
  },
  userInfo: {
    backgroundColor: 'transparent',
    marginBottom: 12,
  },
  userInfoHorizontal: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
  },
  avatarWrapper: {
    height: '100%',
    width: '100%',
  },
  avatar: {
    borderRadius: Platform.select({
      web: '50%',
      default: 150 / 2,
    }),
    height: '100%',
    width: '100%',
  },
  buttonsRow: {
    alignItems: 'center',
    height: 70,
    justifyContent: 'space-between',
    marginBottom: 0,
    marginTop: 1,
  },
  leftButton: {
    flex: 1,
    height: 44,
    marginRight: -12,
    elevation: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  leftButtonContent: {
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  rightButton: {
    flex: 1,
    height: 44,
    marginLeft: -12,
    elevation: 0,
    display: 'flex',
    justifyContent: 'center',
  },
  rightButtonContent: {
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  leftButtonText: {
    marginRight: theme.sizes.defaultDouble,
  },
  rightButtonText: {
    marginLeft: theme.sizes.defaultDouble,
  },
  bigNumberWrapper: {
    alignItems: 'baseline',
  },
  bigNumberUnitStyles: {
    marginRight: normalize(-20),
  },
})

Dashboard.navigationOptions = ({ navigation, screenProps }) => {
  return {
    navigationBar: () => <TabsView goTo={navigation.navigate} routes={screenProps.routes} navigation={navigation} />,
    title: 'Wallet',
    disableScroll: true,
  }
}

const WrappedDashboard = withStyles(getStylesFromProps)(Dashboard)

export default createStackNavigator({
  Home: WrappedDashboard,
  Delete: WrappedDashboard,
  Claim,
  Receive,
  Who: {
    screen: Who,
    path: ':action/Who',
    params: { action: ACTION_SEND },
  },
  Amount: {
    screen: Amount,
    path: ':action/Amount',
    params: { action: ACTION_SEND },
  },
  Reason: {
    screen: Reason,
    path: ':action/Reason',
    params: { action: ACTION_SEND },
  },
  ReceiveToAddress,
  ReceiveSummary,

  SendLinkSummary,
  SendByQR,
  SendToAddress,

  FaceVerification,
  FaceVerificationIntro,
  FaceVerificationError,

  SendQRSummary,

  TransactionConfirmation: {
    screen: TransactionConfirmation,
    path: ':action/TransactionConfirmation',
    params: { action: ACTION_SEND },
  },

  // PP: PrivacyPolicy,
  // PrivacyArticle,
  TOU: PrivacyPolicyAndTerms,
  Support,
  Statistics,
  Recover: Mnemonics,
  OutOfGasError,
  Rewards: Invite,
  HandlePaymentLink,
})
