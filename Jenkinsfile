def exec_sh (cmd) {
    if (Boolean.valueOf(isUnix())) {
        sh cmd
    } else {
        bat cmd
    }
}

pipeline {
    agent any
    stages {
        stage('Installing dependencies') {
            steps {
                exec_sh 'npm i'
            }
        }
        stage('Build') {
            steps {
                exec_sh 'npx tsc'
                archiveArtifacts artifacts: 'dist/**/*', fingerprint : true
            }
        }
        stage('Test') {
            steps {
                exec_sh 'npm test'
            }
        }
    }
}