package com.tutorschedule.app.di

import com.tutorschedule.navigation.ScheduleNavigation
import com.tutorschedule.navigation.ScheduleNavigationImpl
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * App 层 Hilt 模块 — 绑定 Navigation 接口实现
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class AppModule {

    @Binds
    @Singleton
    abstract fun bindScheduleNavigation(impl: ScheduleNavigationImpl): ScheduleNavigation
}
