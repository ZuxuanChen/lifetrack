package com.tutorschedule.remote.di

import com.tutorschedule.common.TutorConstants
import com.tutorschedule.data.datasource.LessonRemoteDataSource
import com.tutorschedule.data.datasource.StudentRemoteDataSource
import com.tutorschedule.data.datasource.TeacherRemoteDataSource
import com.tutorschedule.remote.api.TutorScheduleApi
import com.tutorschedule.remote.datasource.RetrofitLessonDataSource
import com.tutorschedule.remote.datasource.RetrofitStudentDataSource
import com.tutorschedule.remote.datasource.RetrofitTeacherDataSource
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RemoteDataSourceModule {

    @Binds
    @Singleton
    abstract fun bindLessonRemoteDataSource(impl: RetrofitLessonDataSource): LessonRemoteDataSource

    @Binds
    @Singleton
    abstract fun bindStudentRemoteDataSource(impl: RetrofitStudentDataSource): StudentRemoteDataSource

    @Binds
    @Singleton
    abstract fun bindTeacherRemoteDataSource(impl: RetrofitTeacherDataSource): TeacherRemoteDataSource

    companion object {
        @Provides
        @Singleton
        fun provideJson(): Json = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            isLenient = true
        }

        @Provides
        @Singleton
        fun provideOkHttpClient(): OkHttpClient {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            return OkHttpClient.Builder()
                .addInterceptor(logging)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()
        }

        @Provides
        @Singleton
        fun provideRetrofit(okHttpClient: OkHttpClient, json: Json): Retrofit {
            return Retrofit.Builder()
                .baseUrl(TutorConstants.BASE_API_URL)
                .client(okHttpClient)
                .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                .build()
        }

        @Provides
        @Singleton
        fun provideTutorScheduleApi(retrofit: Retrofit): TutorScheduleApi {
            return retrofit.create(TutorScheduleApi::class.java)
        }
    }
}
