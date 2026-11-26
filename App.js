// React Native (Expo, JavaScript). Run: npx create-expo-app motion-demo, replace App.js with this file, then: npx expo start (scan the QR with Expo Go)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, PanResponder, ScrollView, Pressable, Easing, useWindowDimensions } from 'react-native';

const R = 28, SH = 260;
const T = [0, 1, 1.08, 1.83, 2.58, 2.66, 3.19, 3.72, 3.8, 4.15, 4.5, 4.56, 5.6];
const H = [1, 0, 0, .56, 0, 0, .28, 0, 0, .12, 0, 0, 0];
const SX = [1, 1.3, 1, 1, 1.22, 1, 1, 1.14, 1, 1, 1.07, 1, 1];
const SY = [1, .72, 1, 1, .8, 1, 1, .88, 1, 1, .94, 1, 1];
const ease = [(u) => u * u, (u) => 1 - (1 - u) * (1 - u), (u) => 1 - (1 - u) * (1 - u)];
function kf(t) {
  let i = 0;
  while (i < 11 && t >= T[i + 1]) i++;
  const u = Math.min(1, (t - T[i]) / (T[i + 1] - T[i])), k = ease[i % 3](u), l = (a) => a[i] + (a[i + 1] - a[i]) * k;
  return { h: l(H), sx: l(SX), sy: l(SY) };
}

function Ball({ color, style, ang = '0deg' }) {
  return (
    <Animated.View style={[{ width: 2 * R, height: 2 * R, borderRadius: R, backgroundColor: color, overflow: 'hidden' }, style]}>
      <Animated.View style={{ position: 'absolute', width: '100%', height: '100%', transform: [{ rotate: ang }] }}>
        <View style={{ position: 'absolute', top: R - 1.5, width: '100%', height: 3, backgroundColor: '#1c1008' }} />
        <View style={{ position: 'absolute', left: R - 1.5, height: '100%', width: 3, backgroundColor: '#1c1008' }} />
      </Animated.View>
      <View style={{ position: 'absolute', left: 10, top: 8, width: 20, height: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.4)' }} />
    </Animated.View>
  );
}

const stage = { height: SH, borderRadius: 10, backgroundColor: '#dfe8ee', overflow: 'hidden' };
const floor = { position: 'absolute', left: 0, right: 0, top: SH * .7, bottom: 0, backgroundColor: '#b7c6d1' };

function Keyframe({ w }) {
  const tm = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(tm, { toValue: 1, duration: 5600, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);
  const gy = SH * .85, fp = Math.min(SH * .6, gy - 2 * R);
  const m = useMemo(() => {
    const N = 112, inp = [], o = { x: [], y: [], sx: [], sy: [], a: [], k: [] };
    for (let i = 0; i <= N; i++) {
      const t = (5.6 * i) / N, f = kf(t), u = Math.min(1, t / 4.9), x = w * .14 + w * .72 * (1 - Math.pow(1 - u, 1.6));
      inp.push(i / N); o.x.push(x - w * .14); o.y.push(-f.h * fp + R * (1 - f.sy)); o.sx.push(f.sx); o.sy.push(f.sy);
      o.a.push(`${((x - w * .14) / R) * 57.3}deg`); o.k.push(1 / (1 + (f.h * fp) / 180));
    }
    return { inp, o };
  }, [w]);
  const I = (arr) => tm.interpolate({ inputRange: m.inp, outputRange: arr });
  return (
    <View style={stage}>
      <View style={floor} />
      <Animated.View style={{ position: 'absolute', left: w * .14 - R, top: gy - 6, width: 2 * R, height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,.35)',
        transform: [{ translateX: I(m.o.x) }, { scaleX: I(m.o.k) }] }} />
      <Ball color="#d8701a" ang={I(m.o.a)} style={{ position: 'absolute', left: w * .14 - R, top: gy - 2 * R,
        transform: [{ translateX: I(m.o.x) }, { translateY: I(m.o.y) }, { scaleX: I(m.o.sx) }, { scaleY: I(m.o.sy) }] }} />
    </View>
  );
}

function Physics({ w }) {
  const s = useRef({ x: 90, y: 40, vx: 140, vy: 0, ang: 0, av: 0, sq: 0, drag: false, g: 1500, e: .72, bx: 0, by: 0 }).current;
  const [, setN] = useState(0), [info, setInfo] = useState({ g: 1500, e: .72 });
  const gy = SH * .85;
  useEffect(() => {
    let raf, last = Date.now();
    const loop = () => {
      const now = Date.now(), dt = Math.min(.03, (now - last) / 1000); last = now;
      const fl = gy - R, { g, e } = s;
      if (!s.drag) {
        const n = 3, hh = dt / n;
        for (let i = 0; i < n; i++) {
          s.vy += g * hh; s.vx *= 1 - .1 * hh; s.x += s.vx * hh; s.y += s.vy * hh; s.ang += s.av * hh;
          if (s.y >= fl) {
            s.y = fl;
            if (s.vy > 0) { const imp = s.vy; s.vy = -s.vy * e; if (imp * e < 45) s.vy = 0; if (imp > 120) s.sq = Math.max(s.sq, Math.min(.34, imp / 2600)); }
            const sl = s.vx - s.av * R, k = Math.min(1, 14 * hh); s.av += (sl / R) * k * .6; s.vx -= sl * k * .4;
            if (Math.abs(s.vy) < 1) s.vx *= 1 - .45 * hh;
          }
          if (s.x < R) { s.x = R; s.vx = Math.abs(s.vx) * e * .9; }
          if (s.x > w - R) { s.x = w - R; s.vx = -Math.abs(s.vx) * e * .9; }
          if (s.y < R) { s.y = R; s.vy = Math.abs(s.vy) * e; }
        }
      } else s.av *= .95;
      s.sq += (0 - s.sq) * Math.min(1, 16 * dt);
      setN((n) => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [w]);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (ev) => {
      const px = ev.nativeEvent.locationX, py = ev.nativeEvent.locationY;
      if (Math.hypot(px - s.x, py - s.y) < R + 14) { s.drag = true; s.vx = s.vy = 0; s.bx = s.x - px; s.by = s.y - py; s.sx0 = px; s.sy0 = py; }
      else { s.x = px; s.y = py; s.vx = s.vy = s.av = 0; }
    },
    onPanResponderMove: (ev, g) => {
      if (!s.drag) return;
      s.x = Math.max(R, s.sx0 + s.bx + g.dx); s.y = Math.max(R, Math.min(gy - R, s.sy0 + s.by + g.dy));
      s.vx = g.vx * 1000; s.vy = g.vy * 1000;
    },
    onPanResponderRelease: () => { s.drag = false; },
    onPanResponderTerminate: () => { s.drag = false; },
  })).current;
  const sv = Math.min(.12, Math.abs(s.vy) / 9000), k = 1 / (1 + Math.max(0, gy - R - s.y) / 180);
  const Btn = ({ t, on }) => <Pressable onPress={on} style={{ borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 }}><Text style={{ fontWeight: '700' }}>{t}</Text></Pressable>;
  const set = (key, d, lo, hi) => { s[key] = Math.min(hi, Math.max(lo, s[key] + d)); setInfo({ g: s.g, e: s.e }); };
  return (
    <View>
      <View style={stage} {...pan.panHandlers}>
        <View pointerEvents="none" style={floor} />
        <View pointerEvents="none" style={{ position: 'absolute', left: s.x - R, top: gy - 6, width: 2 * R, height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,.35)', transform: [{ scaleX: k }] }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: s.x - R, top: s.y - R + R * (1 - (1 - s.sq + sv)), transform: [{ scaleX: 1 + s.sq - sv * .6 }, { scaleY: 1 - s.sq + sv }] }}>
          <Ball color="#c9dd2c" ang={`${s.ang * 57.3}deg`} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Text style={{ marginRight: 8 }}>Gravity {Math.round(info.g)}</Text><Btn t="-" on={() => set('g', -200, 300, 2600)} /><Btn t="+" on={() => set('g', 200, 300, 2600)} />
        <Text style={{ marginHorizontal: 8 }}>Bounce {Math.round(info.e * 100)}%</Text><Btn t="-" on={() => set('e', -.1, .1, .95)} /><Btn t="+" on={() => set('e', .1, .1, .95)} />
      </View>
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions(), w = width - 32;
  return (
    <ScrollView style={{ backgroundColor: '#e9eff3' }} contentContainerStyle={{ padding: 16, paddingTop: 56, gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: '800' }}>Keyframe vs Physics</Text>
      <Text>Keyframe: authored in advance</Text>
      <Keyframe w={w} />
      <Text>Physics: drag and throw the ball, or tap to drop it</Text>
      <Physics w={w} />
    </ScrollView>
  );
}
