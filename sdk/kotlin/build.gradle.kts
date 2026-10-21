import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.openapitools.generator.gradle.plugin.tasks.GenerateTask
import org.gradle.api.tasks.compile.JavaCompile
import org.gradle.plugins.signing.Sign

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.openapi.generator)
    alias(libs.plugins.dokka)
    alias(libs.plugins.maven.publish)
}

description = "Kotlin/JVM SDK for the signed Lingya Agents OpenAPI"

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        javaParameters.set(true)
        freeCompilerArgs.add("-Xjsr305=strict")
    }
}

tasks.withType<JavaCompile>().configureEach {
    options.release.set(17)
}

java {
    withSourcesJar()
}

dependencyLocking {
    lockAllConfigurations()
}

sourceSets {
    main {
        kotlin.srcDir("generated/src/main/kotlin")
    }
}

dependencies {
    api(libs.coroutines.core)
    api(libs.jackson.kotlin)
    api(libs.jackson.jsr310)
    api(libs.okhttp)
    implementation(libs.okhttp.logging)
    api(libs.retrofit)
    api(libs.retrofit.jackson)
    implementation(libs.retrofit.scalars)

    testImplementation(platform(libs.junit.bom))
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.mockwebserver)
    testImplementation(libs.coroutines.test)
    testRuntimeOnly(libs.junit.launcher)
}

val generatedOutput = layout.buildDirectory.dir("openapi-generator")

tasks.named<GenerateTask>("openApiGenerate") {
    configFile.set(layout.projectDirectory.file("openapi-generator/config.yaml").asFile.absolutePath)
    inputSpec.set(layout.projectDirectory.file("openapi/lingya-agents-v1.yaml").asFile.absolutePath)
    outputDir.set(generatedOutput.get().asFile.absolutePath)
    templateDir.set(layout.projectDirectory.dir("openapi-generator/templates").asFile.absolutePath)
    cleanupOutput.set(true)
}

val generateSdk = tasks.register<Sync>("generateSdk") {
    group = "openapi tools"
    description = "Regenerates typed API interfaces and models from the pinned contract."
    dependsOn(tasks.named("openApiGenerate"))
    from(generatedOutput.map { it.dir("src/main/kotlin") })
    into(layout.projectDirectory.dir("generated/src/main/kotlin"))
}

val generateBoundApi = tasks.register<Exec>("generateBoundApi") {
    group = "openapi tools"
    description = "Generates channel-bound public facades from the pinned operation manifest."
    dependsOn(generateSdk)
    commandLine("node", "scripts/generate-bound-api.mjs")
    inputs.file(layout.projectDirectory.file("scripts/generate-bound-api.mjs"))
    inputs.file(layout.projectDirectory.file("openapi/endpoints.json"))
    inputs.dir(layout.projectDirectory.dir("generated/src/main/kotlin/cloud/lingya/agents/sdk/generated/api"))
    outputs.dir(layout.projectDirectory.dir("src/main/kotlin/cloud/lingya/agents/sdk/api"))
}

tasks.named("compileKotlin") {
}

tasks.matching { it.name == "sourcesJar" || it.name.startsWith("dokkaGenerate") }.configureEach {
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()
}

tasks.named<Test>("test") {
    useJUnitPlatform { excludeTags("live") }
}

tasks.register<Test>("liveTest") {
    group = "verification"
    description = "Runs opt-in integration tests against a deployed Lingya Agents API."
    testClassesDirs = sourceSets["test"].output.classesDirs
    classpath = sourceSets["test"].runtimeClasspath
    useJUnitPlatform { includeTags("live") }
    outputs.upToDateWhen { false }
}

val signingKeyPresent = providers.gradleProperty("signingInMemoryKey").orNull != null
tasks.withType<Sign>().configureEach {
    enabled = signingKeyPresent
}

mavenPublishing {
    publishToMavenCentral()
    signAllPublications()
    coordinates("cloud.lingya", "lingya-agents-sdk", project.version.toString())
    pom {
        name.set("Lingya Agents Kotlin SDK")
        description.set(project.description)
        inceptionYear.set("2026")
        url.set("https://github.com/lingya-ai/lingya-agents-sdk-kotlin")
        licenses {
            license {
                name.set("MIT License")
                url.set("https://opensource.org/licenses/MIT")
                distribution.set("repo")
            }
        }
        developers {
            developer {
                id.set("lingya-ai")
                name.set("Lingya AI")
                url.set("https://github.com/lingya-ai")
            }
        }
        scm {
            connection.set("scm:git:https://github.com/lingya-ai/lingya-agents-sdk-kotlin.git")
            developerConnection.set("scm:git:ssh://git@github.com/lingya-ai/lingya-agents-sdk-kotlin.git")
            url.set("https://github.com/lingya-ai/lingya-agents-sdk-kotlin")
        }
    }
}
