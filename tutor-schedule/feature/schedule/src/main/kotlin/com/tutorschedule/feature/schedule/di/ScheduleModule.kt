package com.tutorschedule.feature.schedule.di

import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.android.components.ViewModelComponent

/**
 * 排课模块 Hilt 模块 — 绑定排课特有的依赖
 *
 * 当前为预留模块，排课用例已在 :core:domain 通过 @Inject 构造函数注入。
 * 如需排课特有的辅助类（如自定义手势处理器），可在此提供绑定。
 */
@Module
@InstallIn(ViewModelComponent::class)
class ScheduleModule
