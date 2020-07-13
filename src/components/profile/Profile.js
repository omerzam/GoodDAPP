// @flow
import React, { useCallback } from 'react'
import { Platform, View } from 'react-native'
import GDStore from '../../lib/undux/GDStore'
import { createStackNavigator } from '../appNavigation/stackNavigation'
import { Section, Text, UserAvatar, Wrapper } from '../common'
import { withStyles } from '../../lib/styles'
import { getDesignRelativeWidth } from '../../lib/utils/sizes'
import EditAvatar from './EditAvatar'
import EditProfile from './EditProfile'
import ProfileDataTable from './ProfileDataTable'
import ProfilePrivacy from './ProfilePrivacy'
import ViewAvatar from './ViewOrUploadAvatar'
import CircleButtonWrapper from './CircleButtonWrapper'
import VerifyEdit from './VerifyEdit'
import VerifyEditCode from './VerifyEditCode'

const avatarSize = getDesignRelativeWidth(136)

const ProfileWrapper = props => {
  const store = GDStore.useStore()
  const profile = store.get('profile')
  const { screenProps, styles } = props

  const handleAvatarPress = useCallback(
    event => {
      event.preventDefault()
      screenProps.push(`ViewAvatar`)
    },
    [screenProps],
  )

  const handlePrivacyPress = useCallback(() => screenProps.push(`ProfilePrivacy`), [screenProps])

  const handleEditProfilePress = useCallback(() => screenProps.push(`EditProfile`), [screenProps])

  return (
    <Wrapper>
      <Section.Row justifyContent="space-between" alignItems="flex-start" style={styles.userDataAndButtonsRow}>
        <CircleButtonWrapper
          label={'Privacy'}
          iconName={'privacy'}
          iconSize={23}
          onPress={handlePrivacyPress}
          containerStyle={styles.iconLeft}
        />
        <View style={styles.userDataWrapper}>
          <UserAvatar
            style={styles.userAvatar}
            profile={profile}
            onPress={handleAvatarPress}
            size={avatarSize}
            imageSize={avatarSize - 6}
            unknownStyle={styles.userAvatar}
          />
          <Text fontSize={22} fontFamily="Roboto Slab" lineHeight={29} style={styles.userName}>
            {!!profile && profile.fullName}
          </Text>
        </View>
        <CircleButtonWrapper
          label={'Edit'}
          iconName={'edit'}
          iconSize={25}
          onPress={handleEditProfilePress}
          style={styles.iconRightContainer}
          containerStyle={styles.iconRight}
        />
      </Section.Row>
      <Section style={styles.section}>
        <View style={styles.emptySpace} />
        <ProfileDataTable profile={profile} showCustomFlag />
      </Section>
    </Wrapper>
  )
}

ProfileWrapper.navigationOptions = {
  title: 'My Profile',
}

const getStylesFromProps = ({ theme }) => {
  const halfAvatarSize = avatarSize / 2
  return {
    emptySpace: {
      height: 75,
      width: '100%',
    },
    section: {
      flexGrow: 1,
      padding: theme.sizes.defaultDouble,
    },
    iconRightContainer: {
      transform: [{ rotateY: '180deg' }],
    },
    iconLeft: {
      position: 'absolute',
      left: getDesignRelativeWidth(20),
    },
    iconRight: {
      position: 'absolute',
      right: getDesignRelativeWidth(20),
    },
    userDataWrapper: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
    },
    userAvatar: {
      borderWidth: 3,
      borderColor: theme.colors.white,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: halfAvatarSize,
    },
    userDataAndButtonsRow: {
      display: 'flex',
      justifyContent: 'center',
      position: 'relative',
      zIndex: 1,
      height: avatarSize / 2,
    },
    userName: {
      marginTop: theme.sizes.default,
    },
  }
}

const Profile = withStyles(getStylesFromProps)(ProfileWrapper)

const commonRoutes = {
  Profile,
  EditProfile,
  ProfilePrivacy,
  ViewAvatar,
  VerifyEdit,
  VerifyEditCode,
}

const nativeOnlyRoutes = {}

const webOnlyRoutes = {
  EditAvatar,
}

const routes = {
  ...commonRoutes,
  ...Platform.select({
    web: webOnlyRoutes,
    default: nativeOnlyRoutes,
  }),
}

export default createStackNavigator(routes)
