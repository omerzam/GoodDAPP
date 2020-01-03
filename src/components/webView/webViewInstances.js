import Config from '../../config/config'
import { createIframe } from './iframe.web'
import { createMobileIframe } from './MobileIframe'
import { Platform } from 'react-native'

export const TermsOfUse =
  Platform.OS === 'web'
    ? createIframe(`https://community.gooddollar.org/${Config.isEToro ? 'pilot-terms' : 'dappterms'}/`, 'Terms of Use')
    : createMobileIframe(
        `https://community.gooddollar.org/${Config.isEToro ? 'pilot-terms' : 'dappterms'}/`,
        'Terms of Use'
      )
export const PrivacyPolicy =
  Platform.OS === 'web'
    ? createIframe('https://community.gooddollar.org/pp/', 'Privacy Policy')
    : createMobileIframe('https://community.gooddollar.org/pp/', 'Privacy Policy')
export const PrivacyArticle =
  Platform.OS === 'web'
    ? createIframe(
        'https://medium.com/gooddollar/gooddollar-identity-pillar-balancing-identity-and-privacy-part-i-face-matching-d6864bcebf54',
        'Privacy And Identity'
      )
    : createMobileIframe(
        'https://medium.com/gooddollar/gooddollar-identity-pillar-balancing-identity-and-privacy-part-i-face-matching-d6864bcebf54',
        'Privacy And Identity'
      )
export const Support =
  Platform.OS === 'web'
    ? createIframe('https://community.gooddollar.org/support-iframe/', 'Feedback & Support')
    : createMobileIframe('https://community.gooddollar.org/support-iframe/', 'Feedback & Support')
export const FAQ =
  Platform.OS === 'web'
    ? createIframe(`https://community.gooddollar.org/faq-${Config.isEToro ? 'etoro' : 'iframe'}`, 'FAQ')
    : createMobileIframe(`https://community.gooddollar.org/faq-${Config.isEToro ? 'etoro' : 'iframe'}`, 'FAQ')
