package com.tutorschedule.remote.datasource

import com.tutorschedule.common.TutorException
import com.tutorschedule.data.datasource.TeacherRemoteDataSource
import com.tutorschedule.data.model.TeacherDataModel
import com.tutorschedule.remote.api.TutorScheduleApi
import com.tutorschedule.remote.dto.ApiResponse
import kotlinx.serialization.json.Json
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RetrofitTeacherDataSource @Inject constructor(
    private val api: TutorScheduleApi
) : TeacherRemoteDataSource {

    override suspend fun fetchAllTeachers(): List<TeacherDataModel> {
        val response = api.getTeachers()
        return parseResponse(response).map { it.toDataModel() }
    }

    private fun <T> parseResponse(response: Response<ApiResponse<T>>): T {
        if (!response.isSuccessful) {
            throw TutorException.NetworkError(
                Exception("HTTP ${response.code()}: ${response.errorBody()?.string()}")
            )
        }
        val body = response.body()
            ?: throw TutorException.NetworkError(Exception("Response body is null"))
        if (body.code != 200) {
            throw TutorException.NetworkError(Exception(body.message ?: "API Error ${body.code}"))
        }
        return body.data
    }

    private fun com.tutorschedule.remote.dto.TeacherDto.toDataModel(): TeacherDataModel {
        return TeacherDataModel(
            id = id,
            name = name,
            subjectCodes = subjectCodes,
            availabilityJson = availabilityJson,
            maxDailyLessons = maxDailyLessons,
            uiColorArgb = uiColorArgb,
            notes = notes
        )
    }
}
