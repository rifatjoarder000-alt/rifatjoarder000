// Android native (Kotlin + Jetpack Compose). In Android Studio: New Project > Empty Activity (Compose). Replace MainActivity.kt with this file, keep your package line, then press Run on a phone or emulator.
package com.example.motiondemo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import kotlin.math.*

private const val R = 28f
private val T = floatArrayOf(0f, 1f, 1.08f, 1.83f, 2.58f, 2.66f, 3.19f, 3.72f, 3.8f, 4.15f, 4.5f, 4.56f, 5.6f)
private val H = floatArrayOf(1f, 0f, 0f, .56f, 0f, 0f, .28f, 0f, 0f, .12f, 0f, 0f, 0f)
private val SX = floatArrayOf(1f, 1.3f, 1f, 1f, 1.22f, 1f, 1f, 1.14f, 1f, 1f, 1.07f, 1f, 1f)
private val SY = floatArrayOf(1f, .72f, 1f, 1f, .8f, 1f, 1f, .88f, 1f, 1f, .94f, 1f, 1f)

class Phys {
    var x = 90f; var y = 40f; var vx = 140f; var vy = 0f; var ang = 0f; var av = 0f; var sq = 0f
    var drag = false; var w = 900f; var h = 700f; var g = 1500f; var e = .72f
    val gy get() = h * .85f
    fun drop(px: Float, py: Float) { x = px; y = py; vx = 0f; vy = 0f; av = 0f }
    fun step(dt: Float) {
        val fl = gy - R
        if (!drag) {
            val hh = dt / 3
            repeat(3) {
                vy += g * hh; vx *= 1 - .1f * hh; x += vx * hh; y += vy * hh; ang += av * hh
                if (y >= fl) {
                    y = fl
                    if (vy > 0) { val imp = vy; vy = -vy * e; if (imp * e < 45) vy = 0f; if (imp > 120) sq = max(sq, min(.34f, imp / 2600f)) }
                    val sl = vx - av * R; val k = min(1f, 14 * hh)
                    av += sl / R * k * .6f; vx -= sl * k * .4f
                    if (abs(vy) < 1) vx *= 1 - .45f * hh
                }
                if (x < R) { x = R; vx = abs(vx) * e * .9f }
                if (x > w - R) { x = w - R; vx = -abs(vx) * e * .9f }
                if (y < R) { y = R; vy = abs(vy) * e }
            }
        } else av *= .95f
        sq += (0 - sq) * min(1f, 16 * dt)
    }
}

private fun kf(t: Float): FloatArray {
    var i = 0
    while (i < 11 && t >= T[i + 1]) i++
    val u = ((t - T[i]) / (T[i + 1] - T[i])).coerceIn(0f, 1f)
    val k = if (i % 3 == 0) u * u else 1 - (1 - u) * (1 - u)
    return floatArrayOf(H[i] + (H[i + 1] - H[i]) * k, SX[i] + (SX[i + 1] - SX[i]) * k, SY[i] + (SY[i + 1] - SY[i]) * k)
}

private fun DrawScope.scene(gy: Float) {
    drawRect(Brush.verticalGradient(listOf(Color(0xFFF1F5F8), Color(0xFFCFDCE5))))
    drawRect(Color(0xFFB7C6D1), Offset(0f, size.height * .7f), Size(size.width, size.height * .3f))
}

private fun DrawScope.ball(x: Float, y: Float, sx: Float, sy: Float, ang: Float, c: Color, ground: Float) {
    val k = 1f / (1f + max(0f, ground - R - y) / 180f)
    drawOval(Color.Black.copy(alpha = .35f * k), Offset(x - R * 1.2f * k, ground - 3f), Size(R * 2.4f * k, 12f * k))
    withTransform({ translate(x, y + R); scale(sx, sy, Offset.Zero); translate(0f, -R) }) {
        clipPath(Path().apply { addOval(Rect(Offset(-R, -R), Size(2 * R, 2 * R))) }) {
            drawRect(c, Offset(-R, -R), Size(2 * R, 2 * R))
            rotate(ang * 180f / PI.toFloat(), Offset.Zero) {
                drawLine(Color(0xFF1C1008), Offset(-R, 0f), Offset(R, 0f), 3f)
                drawLine(Color(0xFF1C1008), Offset(0f, -R), Offset(0f, R), 3f)
            }
            drawCircle(Brush.radialGradient(listOf(Color(0xAAFFFFFF), Color.Transparent, Color(0x77000000)), center = Offset(-R * .4f, -R * .5f), radius = R * 1.6f), R)
        }
    }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { Surface { Screen() } } }
    }
}

@Composable
fun Screen() {
    val p = remember { Phys() }
    var tick by remember { mutableIntStateOf(0) }
    var kt by remember { mutableFloatStateOf(0f) }
    var g by remember { mutableFloatStateOf(1500f) }
    var e by remember { mutableFloatStateOf(.72f) }
    p.g = g; p.e = e
    LaunchedEffect(Unit) {
        var last = 0L
        while (true) {
            val t = withFrameNanos { it }
            val dt = if (last == 0L) .016f else min(.03f, (t - last) / 1e9f)
            last = t; kt = (kt + dt) % 5.6f; p.step(dt); tick++
        }
    }
    Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp).statusBarsPadding(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Keyframe vs Physics", style = MaterialTheme.typography.headlineMedium)
        Text("Keyframe: authored in advance")
        Canvas(Modifier.fillMaxWidth().height(260.dp)) {
            val gy = size.height * .85f; val f = kf(kt); val fp = min(size.height * .6f, gy - 2 * R)
            val u = min(1f, kt / 4.9f); val x = size.width * .14f + size.width * .72f * (1 - (1 - u).pow(1.6f))
            scene(gy); ball(x, gy - R - f[0] * fp, f[1], f[2], (x - size.width * .14f) / R, Color(0xFFD8701A), gy)
        }
        Text("Physics: drag and throw the ball, or tap to drop it")
        Canvas(Modifier.fillMaxWidth().height(260.dp)
            .pointerInput(Unit) { detectTapGestures { o -> p.drop(o.x, o.y) } }
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { o -> if (hypot(o.x - p.x, o.y - p.y) < R * 3) { p.drag = true; p.vx = 0f; p.vy = 0f } },
                    onDrag = { ch, d ->
                        if (p.drag) {
                            p.x = ch.position.x.coerceIn(R, p.w - R); p.y = ch.position.y.coerceIn(R, p.gy - R)
                            p.vx = .5f * p.vx + .5f * d.x / .016f; p.vy = .5f * p.vy + .5f * d.y / .016f
                        }
                    },
                    onDragEnd = { p.drag = false }, onDragCancel = { p.drag = false })
            }) {
            val t = tick; p.w = size.width; p.h = size.height
            val sv = min(.12f, abs(p.vy) / 9000f)
            scene(p.gy); ball(p.x, p.y, 1 + p.sq - sv * .6f, 1 - p.sq + sv, p.ang, Color(0xFFC9DD2C), p.gy)
        }
        Text("Gravity ${g.roundToInt()}"); Slider(g, { g = it }, valueRange = 300f..2600f)
        Text("Bounce ${(e * 100).roundToInt()}%"); Slider(e, { e = it }, valueRange = 0.1f..0.95f)
    }
}
