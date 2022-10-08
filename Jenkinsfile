pipeline {
    agent any
    stages {
        stage('Installing dependencies') {
            steps {
                sh 'npm i'
            }
        }
        stage('Build') {
            steps {
                sh 'npx tsc'
                archiveArtifacts artifacts: 'dist/*', fingerprint : true
            }
        }
    }
}