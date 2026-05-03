plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "com.tutorschedule.domain"
    compileSdk = 34

    defaultConfig {
        minSdk = 26
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    // 纯 Kotlin 模块 — 零 Android 依赖
    implementation(project(":core:common"))

    // kotlinx-datetime（跨平台时间库，非 Android SDK）
    implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.6.0")

    // 仅用于 @Inject 注解和 @Singleton（Hilt 提供了 JVM 版本的注解包）
    compileOnly("javax.inject:javax.inject:1")

    // 测试
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
}
