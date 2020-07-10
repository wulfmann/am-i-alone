import '../styles/global.scss';

if (process.browser) {
  import('webfontloader').then(WebFont => {
    WebFont.load({
      google: {
        families: ['EB Garamond']
      }
    });
  })
}

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp