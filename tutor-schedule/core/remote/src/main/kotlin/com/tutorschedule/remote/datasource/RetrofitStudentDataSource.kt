package com.tutorschedule.remote.datasource

import com.tutorschedule.common.TutorException
import com.tutorschedule.data.datasource.StudentRemoteDataSource
import com.tutorschedule.data.model.StudentDataModel
import com.tutorschedule.remote.api.TutorScheduleApi
import com.tutorschedule.remote.dto.ApiResponse
import kotlinx.serialization.json.Json
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RetrofitStudentDataSource @Inject constructor(
    private val api: TutorScheduleApi
) : StudentRemoteDataSource {

    override suspend fun fetchAllStudents(): List<StudentDataModel> {
        val response = api.getStudents()
        return parseResponse(response).map { it.toDataModel() }
    }

    override suspend fun createStudent(student: StudentDataModel): StudentDataModel {
        // 简化：实际应调用对应的 create API
        throw NotImplementedError("Create student API not yet implemented")
    }

    override suspend fun updateStudent(id: String, student: StudentDataModel): StudentDataModel {
        throw NotImplementedError("Update student API not yet implemented")
    }

    override suspend fun deleteStudent(id: String) {
        throw NotImplementedError("Delete student API not yet implemented")
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

    private fun com.tutorschedule.remote.dto.StudentDto.toDataModel(): StudentDataModel {
        return StudentDataModel(
            id = id,
            name = name,
            gradeCode = gradeCode,
            enrolledSubjectCodes = enrolledSubjects,
            parentName = parentName,
            parentPhone = parentPhone,
            remainingHoursJson = Json.encodeToString(remainingHours),
            notes = notes,
            createdAtMillis = parseIsoToMillis(createdAt),
            updatedAtMillis = parseIsoToMillis(updatedAt)
        )
    }

    private fun parseIsoToMillis(iso: String): Long {
        return try {
            kotlinx.datetime.Instant.parse(iso).toEpochMilliseconds()
        } catch (_: Exception) { 0L }
    }
}
