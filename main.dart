// Flutter (Dart). Run: flutter create motion_demo, replace lib/main.dart with this file, then: flutter run
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

void main() => runApp(const MaterialApp(debugShowCheckedModeBanner: false, home: Demo()));

const r = 28.0;
const T = [0, 1, 1.08, 1.83, 2.58, 2.66, 3.19, 3.72, 3.8, 4.15, 4.5, 4.56, 5.6];
const H = [1, 0, 0, .56, 0, 0, .28, 0, 0, .12, 0, 0, 0];
const SX = [1, 1.3, 1, 1, 1.22, 1, 1, 1.14, 1, 1, 1.07, 1, 1];
const SY = [1, .72, 1, 1, .8, 1, 1, .88, 1, 1, .94, 1, 1];

class Demo extends StatefulWidget {
  const Demo({super.key});
  @override
  State<Demo> createState() => _S();
}

class _S extends State<Demo> with SingleTickerProviderStateMixin {
  late final Ticker tk;
  Duration last = Duration.zero;
  double kt = 0, w = 320, h = 260, x = 90, y = 40, vx = 140, vy = 0, ang = 0, av = 0, sq = 0, g = 1500, e = .72;
  bool drag = false;
  double get gy => h * .85;

  @override
  void initState() {
    super.initState();
    tk = createTicker((t) {
      final dt = ((t - last).inMicroseconds / 1e6).clamp(0.0, .03);
      last = t;
      kt = (kt + dt) % 5.6;
      step(dt);
      setState(() {});
    })..start();
  }

  @override
  void dispose() {
    tk.dispose();
    super.dispose();
  }

  void step(double dt) {
    final fl = gy - r;
    if (!drag) {
      const n = 3;
      final hh = dt / n;
      for (var i = 0; i < n; i++) {
        vy += g * hh; vx *= 1 - .1 * hh; x += vx * hh; y += vy * hh; ang += av * hh;
        if (y >= fl) {
          y = fl;
          if (vy > 0) {
            final imp = vy; vy = -vy * e;
            if (imp * e < 45) vy = 0;
            if (imp > 120) sq = max(sq, min(.34, imp / 2600));
          }
          final sl = vx - av * r, k = min(1.0, 14 * hh);
          av += sl / r * k * .6; vx -= sl * k * .4;
          if (vy.abs() < 1) vx *= 1 - .45 * hh;
        }
        if (x < r) { x = r; vx = vx.abs() * e * .9; }
        if (x > w - r) { x = w - r; vx = -vx.abs() * e * .9; }
        if (y < r) { y = r; vy = vy.abs() * e; }
      }
    } else { av *= .95; }
    sq += (0 - sq) * min(1.0, 16 * dt);
  }

  List<double> kf() {
    var i = 0;
    while (i < 11 && kt >= T[i + 1]) i++;
    final u = ((kt - T[i]) / (T[i + 1] - T[i])).clamp(0.0, 1.0);
    final k = i % 3 == 0 ? u * u : 1 - (1 - u) * (1 - u);
    return [H[i] + (H[i + 1] - H[i]) * k, SX[i] + (SX[i + 1] - SX[i]) * k, SY[i] + (SY[i + 1] - SY[i]) * k];
  }

  @override
  Widget build(BuildContext c) {
    final f = kf();
    final fp = min(h * .6, gy - 2 * r), u = min(1.0, kt / 4.9);
    final kx = w * .14 + w * .72 * (1 - pow(1 - u, 1.6));
    final sv = min(.12, vy.abs() / 9000);
    return Scaffold(
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(16), children: [
          const Text('Keyframe vs Physics', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          const Text('Keyframe: authored in advance'),
          LayoutBuilder(builder: (_, bc) {
            w = bc.maxWidth;
            return ClipRRect(borderRadius: BorderRadius.circular(10), child: CustomPaint(size: Size(bc.maxWidth, h),
              painter: P(kx, gy - r - f[0] * fp, f[1], f[2], (kx - w * .14) / r, const Color(0xFFD8701A), gy)));
          }),
          const SizedBox(height: 16),
          const Text('Physics: drag and throw the ball, or tap to drop it'),
          GestureDetector(
            onPanDown: (d) {
              final p = d.localPosition;
              if ((p - Offset(x, y)).distance < r + 14) { drag = true; vx = vy = 0; }
              else { x = p.dx; y = p.dy; vx = vy = 0; av = 0; }
            },
            onPanUpdate: (d) {
              if (!drag) return;
              x = d.localPosition.dx.clamp(r, w - r); y = d.localPosition.dy.clamp(r, gy - r);
              vx = .5 * vx + .5 * d.delta.dx / .016; vy = .5 * vy + .5 * d.delta.dy / .016;
            },
            onPanEnd: (_) { drag = false; },
            onPanCancel: () { drag = false; },
            child: ClipRRect(borderRadius: BorderRadius.circular(10), child: CustomPaint(size: Size(w, h),
              painter: P(x, y, 1 + sq - sv * .6, 1 - sq + sv, ang, const Color(0xFFC9DD2C), gy))),
          ),
          Row(children: [const Text('Gravity'), Expanded(child: Slider(value: g, min: 300, max: 2600, onChanged: (v) => g = v))]),
          Row(children: [const Text('Bounce'), Expanded(child: Slider(value: e, min: .1, max: .95, onChanged: (v) => e = v))]),
        ]),
      ),
    );
  }
}

class P extends CustomPainter {
  final double x, y, sx, sy, ang, ground;
  final Color color;
  P(this.x, this.y, this.sx, this.sy, this.ang, this.color, this.ground);
  @override
  void paint(Canvas c, Size s) {
    c.drawRect(Offset.zero & s, Paint()..shader = const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
      colors: [Color(0xFFF1F5F8), Color(0xFFCFDCE5)]).createShader(Offset.zero & s));
    c.drawRect(Rect.fromLTWH(0, s.height * .7, s.width, s.height * .3), Paint()..color = const Color(0xFFB7C6D1));
    final k = 1 / (1 + max(0, ground - r - y) / 180);
    c.drawOval(Rect.fromCenter(center: Offset(x, ground + 3), width: r * 2.4 * k, height: 12 * k), Paint()..color = Color.fromRGBO(0, 0, 0, .35 * k));
    c.save();
    c.translate(x, y + r); c.scale(sx, sy); c.translate(0, -r);
    final rect = Rect.fromCircle(center: Offset.zero, radius: r);
    c.clipPath(Path()..addOval(rect));
    c.drawRect(rect, Paint()..color = color);
    c.rotate(ang);
    final seam = Paint()..color = const Color(0xFF1C1008)..strokeWidth = 3;
    c.drawLine(const Offset(-r, 0), const Offset(r, 0), seam);
    c.drawLine(const Offset(0, -r), const Offset(0, r), seam);
    c.rotate(-ang);
    c.drawRect(rect, Paint()..shader = const RadialGradient(center: Alignment(-.4, -.5), radius: 1,
      colors: [Color(0xAAFFFFFF), Color(0x00FFFFFF), Color(0x77000000)], stops: [0, .45, 1]).createShader(rect));
    c.restore();
  }
  @override
  bool shouldRepaint(_) => true;
}
