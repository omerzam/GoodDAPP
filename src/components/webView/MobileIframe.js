import React, { useEffect } from 'react'
// import SimpleStore from '../../lib/undux/SimpleStore'
// import { getMaxDeviceHeight } from '../../lib/utils/Orientation'
import { View } from 'react-native'
import { Text } from 'react-native'
// import { WebView } from 'react-native'

// const wHeight = getMaxDeviceHeight()

export const createMobileIframe = (src, title) => {
  const MobileIframe = props => {
    // const store = SimpleStore.useStore()

    // const isLoaded = () => {
    //   store.set('loadingIndicator')({ loading: false })
    // }

    // useEffect(() => {
    //   store.set('loadingIndicator')({ loading: true })
    // }, [])

    //Need install react-native-webview library
    return (
      <View>
        <Text>External pages</Text>
      </View>
      //   <WebView
      //     title={title}
      //     seamless
      //     frameBorder="0"
      //     onLoad={isLoaded}
      //     src={src}
      //     width="100%"
      //     height="100%"
      //     style={{ height: wHeight }}
      //   />
    )
  }
  MobileIframe.navigationOptions = {
    title,
  }
  return MobileIframe
}
