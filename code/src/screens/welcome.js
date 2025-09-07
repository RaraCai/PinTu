import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const {width, height} = Dimensions.get('window');

const WelcomeScreen = ({navigation}) => {
  return (
    <ScrollView>
      <View style={styles.container}>
        <Image source={require('../assets/welcome.png')} style={styles.image} />

          <LinearGradient
            colors={['rgba(153, 145, 246, 1)', 'rgba(117, 106, 237, 1)']}
            start={{x: 0.9928, y: 0.5072}}
            end={{x: 0.0072, y: 0.5072}}
            style={styles.button}>
            <Text
              style={styles.buttonText}
              onPress={() => navigation.navigate('Login')}>
              立即体验
            </Text>
          </LinearGradient>
          
        <Text style={styles.text1}>拼途</Text>
        <Text style={styles.text2}>使用拼途</Text>
        <Text style={styles.text3}>开启您的私家车拼车之旅吧</Text>
      </View>
    </ScrollView>
  );
};

// 定义样式
const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  image: {
    width: width * 0.74,
    height: width * 0.74,
    position: 'absolute',
    top: height * 0.19,
    left: width * 0.15,
    opacity: 1,
  },
  button: {
    width: width * 0.53,
    height: height * 0.06,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: height * 0.06,
    left: width * 0.245,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  text1: {
    position: 'absolute',
    left: width * 0.42,
    top: height * 0.62,
    width: width * 0.2,
    height: height * 0.06,
    opacity: 1,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 5,
    lineHeight: 48,
    color: 'rgba(56, 56, 56, 1)',
    textAlign: 'left',
  },
  text2: {
    position: 'absolute',
    left: width * 0.12,
    top: height * 0.69,
    width: width * 0.76,
    height: height * 0.06,
    opacity: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 24,
    color: 'rgba(119, 128, 141, 1)',
    textAlign: 'center',
  },
  text3: {
    position: 'absolute',
    left: width * 0.12,
    top: height * 0.72,
    width: width * 0.76,
    height: height * 0.06,
    opacity: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 24,
    color: 'rgba(119, 128, 141, 1)',
    textAlign: 'center',
  },
});

export default WelcomeScreen;
