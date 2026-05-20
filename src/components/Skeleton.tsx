import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Easing,
} from 'react-native';

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

type SkeletonCircleProps = {
  size: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonCircle({ size, style }: SkeletonCircleProps) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
      style={style}
    />
  );
}

type SkeletonTextProps = {
  width?: number | string;
  height?: number;
  lines?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonText({
  width = '100%',
  height = 14,
  lines = 1,
  style,
}: SkeletonTextProps) {
  if (lines <= 1) {
    return (
      <Skeleton
        width={width}
        height={height}
        borderRadius={4}
        style={style}
      />
    );
  }
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1;
        return (
          <Skeleton
            key={i}
            width={isLast ? '60%' : width}
            height={height}
            borderRadius={4}
            style={i > 0 ? { marginTop: 6 } : undefined}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#2a2a2a',
  },
});
