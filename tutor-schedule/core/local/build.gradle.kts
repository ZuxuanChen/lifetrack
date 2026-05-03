plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.tutorschedule.local"
    compileSdk = 34
    defaultConfig { minSdk = 26 }
    kotlinOptions { jvmTarget = "1.8" }
}

dependencies {
    implementation(project(":core:common"))
    implementation(project(":core:data"))

    // Room
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Hilt
    implementation("com.google.dagger:hilt-android:2.51.1")
    ksp("com.google.dagger:hilt-compiler:2.51.1")

    // kotlinx-serialization（用于 JSON 字段存储）
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
}
