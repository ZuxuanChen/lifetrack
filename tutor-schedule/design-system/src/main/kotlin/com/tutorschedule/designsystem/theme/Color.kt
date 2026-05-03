package com.tutorschedule.designsystem.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color

/**
 * 设计系统 — 颜色定义
 * 参考：Material Design 3 + 柔和学术风
 */

// === 主色 ===
val Primary10 = Color(0xFF001945)
val Primary20 = Color(0xFF00306F)
val Primary30 = Color(0xFF00469C)
val Primary40 = Color(0xFF4A6FA5)  // 学院蓝（主色）
val Primary80 = Color(0xFFA5C3FF)
val Primary90 = Color(0xFFD6E3F8)
val Primary95 = Color(0xFFEEF3FC)

// === 次色 ===
val Secondary40 = Color(0xFF6B8E6E)  // 自然绿
val Secondary90 = Color(0xFFD6EBD7)

// === 强调色 ===
val Tertiary40 = Color(0xFFE07A5F)  // 暖珊瑚
val Tertiary90 = Color(0xFFFFDDD4)

// === 中性色 ===
val Neutral0 = Color(0xFF000000)
val Neutral10 = Color(0xFF1C1C1C)
val Neutral20 = Color(0xFF313131)
val Neutral90 = Color(0xFFE8E8E8)
val Neutral95 = Color(0xFFF2F2F2)
val Neutral99 = Color(0xFFFDFDFD)  // 背景白

// === 表面色 ===
val SurfaceVariant = Color(0xFFF0F2F5)  // 卡片背景
val Outline = Color(0xFFD1D5DB)

// === 功能色 ===
val Success = Color(0xFF4CAF50)
val Warning = Color(0xFFFF9800)
val Error40 = Color(0xFFB3261E)
val Error90 = Color(0xFFFFDAD6)
val Info = Color(0xFF64B5F6)

// === 学科色 ===
val SubjectMath = Color(0xFF5B8BD8)
val SubjectEnglish = Color(0xFFE07A5F)
val SubjectPhysics = Color(0xFF81C784)
val SubjectChemistry = Color(0xFFFFB74D)
val SubjectChinese = Color(0xFF9575CD)
val SubjectBiology = Color(0xFF4DB6AC)
val SubjectHistory = Color(0xFF8D6E63)
val SubjectGeography = Color(0xFF64B5F6)
val SubjectDefault = Color(0xFF9E9E9E)

fun getSubjectColor(subjectCode: String): Color = when (subjectCode) {
    "MATH" -> SubjectMath
    "ENGLISH" -> SubjectEnglish
    "PHYSICS" -> SubjectPhysics
    "CHEMISTRY" -> SubjectChemistry
    "CHINESE" -> SubjectChinese
    "BIOLOGY" -> SubjectBiology
    "HISTORY" -> SubjectHistory
    "GEOGRAPHY" -> SubjectGeography
    else -> SubjectDefault
}

// === Material3 配色方案 ===
val LightColorScheme = lightColorScheme(
    primary = Primary40,
    onPrimary = Color.White,
    primaryContainer = Primary90,
    onPrimaryContainer = Primary10,
    secondary = Secondary40,
    onSecondary = Color.White,
    secondaryContainer = Secondary90,
    onSecondaryContainer = Color(0xFF0A1F0B),
    tertiary = Tertiary40,
    onTertiary = Color.White,
    tertiaryContainer = Tertiary90,
    onTertiaryContainer = Color(0xFF3E0900),
    surface = Neutral99,
    onSurface = Neutral10,
    surfaceVariant = SurfaceVariant,
    onSurfaceVariant = Neutral20,
    outline = Outline,
    error = Error40,
    onError = Color.White,
    errorContainer = Error90,
    onErrorContainer = Color(0xFF410E0B)
)

val DarkColorScheme = darkColorScheme(
    primary = Primary80,
    onPrimary = Primary20,
    primaryContainer = Primary30,
    onPrimaryContainer = Primary90,
    // ... 简化暗色方案
)
