plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "com.tutorschedule.common"
    compileSdk = 34
    defaultConfig { minSdk = 26 }
    kotlinOptions { jvmTarget = "1.8" }
}

dependencies {
    // 纯 Kotlin 工具模块
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
}
