package com.tutorschedule.data.di

import com.tutorschedule.data.repository.LessonRepositoryImpl
import com.tutorschedule.data.repository.StudentRepositoryImpl
import com.tutorschedule.data.repository.TeacherRepositoryImpl
import com.tutorschedule.data.repository.ScheduleConflictChecker
import com.tutorschedule.domain.repository.LessonRepository
import com.tutorschedule.domain.repository.StudentRepository
import com.tutorschedule.domain.repository.TeacherRepository
import com.tutorschedule.domain.repository.ConflictChecker
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Data 层 Hilt 模块 — 绑定 Repository 接口到实现
 *
 * 注意：DataSource 接口的具体实现绑定在 :core:local 和 :core:remote 的模块中，
 * Hilt 会自动合并所有模块中的绑定。
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindLessonRepository(impl: LessonRepositoryImpl): LessonRepository

    @Binds
    @Singleton
    abstract fun bindStudentRepository(impl: StudentRepositoryImpl): StudentRepository

    @Binds
    @Singleton
    abstract fun bindTeacherRepository(impl: TeacherRepositoryImpl): TeacherRepository

    @Binds
    @Singleton
    abstract fun bindConflictChecker(impl: ScheduleConflictChecker): ConflictChecker
}
