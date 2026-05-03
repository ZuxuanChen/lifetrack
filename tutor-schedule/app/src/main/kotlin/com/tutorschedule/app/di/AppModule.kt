package com.tutorschedule.app.di

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import com.tutorschedule.data.repository.NetworkMonitor
import com.tutorschedule.data.repository.SyncEngine
import com.tutorschedule.navigation.ScheduleNavigation
import com.tutorschedule.navigation.ScheduleNavigationImpl
import com.tutorschedule.navigation.SettingsNavigation
import com.tutorschedule.navigation.SettingsNavigationImpl
import com.tutorschedule.navigation.StudentNavigation
import com.tutorschedule.navigation.StudentNavigationImpl
import com.tutorschedule.navigation.TeacherNavigation
import com.tutorschedule.navigation.TeacherNavigationImpl
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Inject
import javax.inject.Singleton

/**
 * App 层 Hilt 模块 — 绑定 Navigation 接口实现 + 全局基础设施
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class AppModule {

    @Binds
    @Singleton
    abstract fun bindScheduleNavigation(impl: ScheduleNavigationImpl): ScheduleNavigation

    @Binds
    @Singleton
    abstract fun bindStudentNavigation(impl: StudentNavigationImpl): StudentNavigation

    @Binds
    @Singleton
    abstract fun bindTeacherNavigation(impl: TeacherNavigationImpl): TeacherNavigation

    @Binds
    @Singleton
    abstract fun bindSettingsNavigation(impl: SettingsNavigationImpl): SettingsNavigation

    @Binds
    @Singleton
    abstract fun bindNetworkMonitor(impl: DefaultNetworkMonitor): NetworkMonitor

    @Binds
    @Singleton
    abstract fun bindSyncEngine(impl: StubSyncEngine): SyncEngine
}

/**
 * 默认网络监控实现 — 接入 ConnectivityManager 判断实际网络状态
 */
@Singleton
class DefaultNetworkMonitor @Inject constructor(
    @ApplicationContext private val context: Context
) : NetworkMonitor {

    override val isOnline: Boolean
        get() {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val network = cm.activeNetwork ?: return false
            val capabilities = cm.getNetworkCapabilities(network) ?: return false
            return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        }
}

/**
 * 同步引擎桩实现（简化版）
 */
@Singleton
class StubSyncEngine @Inject constructor() : SyncEngine {
    override suspend fun requestSync(week: com.tutorschedule.common.WeekRange) {
        // TODO: 实现增量同步逻辑
    }
}
