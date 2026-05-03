plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.tutorschedule.navigation"
    compileSdk = 34
    defaultConfig { minSdk = 26 }
    kotlinOptions { jvmTarget = "1.8" }
}

dependencies {
    // 仅依赖 Navigation Compose 的类型
    implementation("androidx.navigation:navigation-compose:2.7.7")
}
