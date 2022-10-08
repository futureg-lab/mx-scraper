pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                sh 'npx tsc'
                archiveArtifacts artifacts: 'dist/*', fingerprint : true
            }
        }
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
    }
}