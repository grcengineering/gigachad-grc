{{/*
Chart name, truncated to 63 characters.
*/}}
{{- define "gigachad-grc.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fully qualified app name, truncated to 63 characters.
*/}}
{{- define "gigachad-grc.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Chart label value.
*/}}
{{- define "gigachad-grc.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to all resources.
*/}}
{{- define "gigachad-grc.labels" -}}
helm.sh/chart: {{ include "gigachad-grc.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: gigachad-grc
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Selector labels for a specific component.
Usage: {{ include "gigachad-grc.selectorLabels" (dict "context" . "component" "controls") }}
*/}}
{{- define "gigachad-grc.selectorLabels" -}}
app.kubernetes.io/name: {{ include "gigachad-grc.name" .context }}
app.kubernetes.io/instance: {{ .context.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Full image reference with optional global registry prefix.
The tag is `required` so a deployment without an explicit version pin
fails at template time rather than silently rolling out `:` (or a
cached stale image). Reach the error by looking at .image.repository
in the message to identify which component is missing its tag.
Usage: {{ include "gigachad-grc.image" (dict "image" .Values.controls.image "global" .Values.global) }}
*/}}
{{- define "gigachad-grc.image" -}}
{{- $registry := .global.imageRegistry | default "" -}}
{{- $tag := required (printf "image.tag is required for repository %q (set <component>.image.tag=<version> in your values file or via --set)" .image.repository) .image.tag -}}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry .image.repository $tag }}
{{- else }}
{{- printf "%s:%s" .image.repository $tag }}
{{- end }}
{{- end }}

{{/*
Image pull policy: use Always if tag is "latest", otherwise use the configured policy.
Usage: {{ include "gigachad-grc.imagePullPolicy" .Values.controls.image }}
*/}}
{{- define "gigachad-grc.imagePullPolicy" -}}
{{- if eq .tag "latest" }}Always{{- else }}{{ .pullPolicy | default "IfNotPresent" }}{{- end }}
{{- end }}

{{/*
Service account name.
*/}}
{{- define "gigachad-grc.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "gigachad-grc.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
PostgreSQL host: internal service or external.
*/}}
{{- define "gigachad-grc.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" (include "gigachad-grc.fullname" .) }}
{{- else }}
{{- .Values.externalDatabase.host | default "localhost" }}
{{- end }}
{{- end }}

{{/*
Full DATABASE_URL connection string.
*/}}
{{- define "gigachad-grc.databaseUrl" -}}
{{- if .Values.externalDatabase.url }}
{{- .Values.externalDatabase.url }}
{{- else }}
{{- printf "postgresql://%s:$(POSTGRES_PASSWORD)@%s:5432/%s" .Values.postgresql.auth.username (include "gigachad-grc.postgresql.host" .) .Values.postgresql.auth.database }}
{{- end }}
{{- end }}

{{/*
Redis host: internal service or external.
*/}}
{{- define "gigachad-grc.redis.host" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis" (include "gigachad-grc.fullname" .) }}
{{- else }}
{{- .Values.externalRedis.host | default "localhost" }}
{{- end }}
{{- end }}

{{/*
Full REDIS_URL connection string.
*/}}
{{- define "gigachad-grc.redisUrl" -}}
{{- if .Values.externalRedis.url }}
{{- .Values.externalRedis.url }}
{{- else }}
{{- printf "redis://:$(REDIS_PASSWORD)@%s:6379" (include "gigachad-grc.redis.host" .) }}
{{- end }}
{{- end }}

{{/*
Keycloak internal URL.
*/}}
{{- define "gigachad-grc.keycloak.url" -}}
{{- printf "http://%s-keycloak:8080" (include "gigachad-grc.fullname" .) }}
{{- end }}

{{/*
RustFS / S3 endpoint.
*/}}
{{- define "gigachad-grc.s3.endpoint" -}}
{{- if .Values.rustfs.enabled }}
{{- printf "%s-rustfs" (include "gigachad-grc.fullname" .) }}
{{- else }}
{{- .Values.externalS3.endpoint }}
{{- end }}
{{- end }}

{{/*
S3 port.
*/}}
{{- define "gigachad-grc.s3.port" -}}
{{- if .Values.rustfs.enabled }}
{{- "9000" }}
{{- else }}
{{- .Values.externalS3.port | default "443" }}
{{- end }}
{{- end }}

{{/*
S3 SSL setting.
*/}}
{{- define "gigachad-grc.s3.useSSL" -}}
{{- if .Values.rustfs.enabled }}
{{- "false" }}
{{- else }}
{{- .Values.externalS3.useSSL | default "true" }}
{{- end }}
{{- end }}

{{/*
Secret name for the chart.
*/}}
{{- define "gigachad-grc.secretName" -}}
{{- printf "%s-secrets" (include "gigachad-grc.fullname" .) }}
{{- end }}

{{/*
ConfigMap name for the chart.
*/}}
{{- define "gigachad-grc.configMapName" -}}
{{- printf "%s-config" (include "gigachad-grc.fullname" .) }}
{{- end }}

{{/*
Common environment variables injected into all backend services.
*/}}
{{- define "gigachad-grc.backendEnv" -}}
- name: NODE_ENV
  value: production
- name: POSTGRES_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "gigachad-grc.secretName" . }}
      key: postgresql-password
- name: DATABASE_URL
  value: {{ include "gigachad-grc.databaseUrl" . }}
- name: REDIS_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "gigachad-grc.secretName" . }}
      key: redis-password
- name: REDIS_URL
  value: {{ include "gigachad-grc.redisUrl" . }}
- name: S3_ENDPOINT
  value: {{ include "gigachad-grc.s3.endpoint" . }}
- name: S3_PORT
  value: {{ include "gigachad-grc.s3.port" . | quote }}
- name: S3_USE_SSL
  value: {{ include "gigachad-grc.s3.useSSL" . | quote }}
- name: S3_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "gigachad-grc.secretName" . }}
      key: s3-access-key
- name: S3_SECRET_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "gigachad-grc.secretName" . }}
      key: s3-secret-key
- name: MINIO_ENDPOINT
  value: {{ include "gigachad-grc.s3.endpoint" . }}
- name: MINIO_PORT
  value: {{ include "gigachad-grc.s3.port" . | quote }}
- name: MINIO_USE_SSL
  value: {{ include "gigachad-grc.s3.useSSL" . | quote }}
- name: MINIO_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "gigachad-grc.secretName" . }}
      key: s3-access-key
- name: MINIO_SECRET_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "gigachad-grc.secretName" . }}
      key: s3-secret-key
{{- if .Values.keycloak.enabled }}
- name: KEYCLOAK_URL
  value: {{ include "gigachad-grc.keycloak.url" . }}
- name: KEYCLOAK_REALM
  value: {{ .Values.keycloak.realm | quote }}
{{- end }}
{{- end }}
