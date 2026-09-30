const useSharedValue = (initialValue) => {
  return {
    value: initialValue,
  };
};

const useFrameCallback = (_callback) => {
  return {
    setActive: () => {},
    isActive: true,
    callbackId: -1,
  };
};

const useDerivedValue = (fn) => {
  return {
    value: fn(),
  };
};

const useAnimatedStyle = (fn) => fn();

const withTiming = (toValue, _config, callback) => {
  if (callback) callback(true);
  return toValue;
};

const withSpring = (toValue, _config, callback) => {
  if (callback) callback(true);
  return toValue;
};

const interpolate = (val) => val;
const interpolateColor = (_val, _inputRange, outputRange) => outputRange[0] ?? '#000000';
const runOnJS = (fn) => fn;
const runOnUI = (fn) => fn;

module.exports = {
  useSharedValue,
  useFrameCallback,
  useDerivedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  interpolateColor,
  runOnJS,
  runOnUI,
};
