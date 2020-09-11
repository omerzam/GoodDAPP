import * as SentryNative from '@sentry/react-native'
import analytics from '@react-native-firebase/analytics'
import amplitude from 'amplitude-js'

export default {
  sentry: SentryNative,
  amplitude: amplitude.getInstance(),
  googleAnalytics: analytics(),
}
