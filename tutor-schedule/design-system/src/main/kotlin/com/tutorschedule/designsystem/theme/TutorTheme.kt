package com.tutorschedule.designsystem.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * 设计系统 — 字体定义
 */
val TutorTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        lineHeight = 40.sp,
        letterSpacing = (-0.5).sp
    ),
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 24.sp
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 18.sp
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        lineHeight = 16.sp
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 14.sp
    )
)

/**
 * 设计系统 — 形状定义
 */
val TutorShapes = Shapes(
    extraSmall = androidx.compose.foundation.shape.RoundedCornerShape(4.dp),
    small = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(24.dp)
)

/**
 * 自定义 CompositionLocal — 用于扩展 MaterialTheme 未覆盖的属性
 */
internal data class TutorColorSchemeExtension(
    val success: Color = Success,
    val warning: Color = Warning,
    val info: Color = Info,
    val subjectColors: Map<String, Color> = mapOf(
        "MATH" to SubjectMath,
        "ENGLISH" to SubjectEnglish,
        "PHYSICS" to SubjectPhysics,
        "CHEMISTRY" to SubjectChemistry,
        "CHINESE" to SubjectChinese,
        "BIOLOGY" to SubjectBiology,
        "HISTORY" to SubjectHistory,
        "GEOGRAPHY" to SubjectGeography
    )
)

val LocalTutorColorExtension = staticCompositionLocalOf { TutorColorSchemeExtension() }

/**
 * 主题入口
 */
@Composable
fun TutorTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val extension = TutorColorSchemeExtension()

    CompositionLocalProvider(LocalTutorColorExtension provides extension) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = TutorTypography,
            shapes = TutorShapes,
            content = content
        )
    }
}

/**
 * 便捷获取扩展颜色的方式
 */
val MaterialTheme.tutorColors: TutorColorSchemeExtension
    @Composable
    get() = LocalTutorColorExtension.current
