from setuptools import setup

setup(
    name='hivemind_webchat',
    version='0.2.1',
    packages=['hivemind_webchat'],
    include_package_data=True,
    install_requires=["jarbas_hive_mind>=0.10.7",
                      "tornado"],
    url='https://github.com/JarbasHiveMind/HiveMind-webchat',
    license='Apache-2.0',
    author='jarbasAI',
    author_email='jarbasai@mailfence.com',
    description='local hivemind webchat',
    entry_points={
        'console_scripts': [
            'HiveMind-webchat=hivemind_webchat.webchat:main'
        ]
    }
)
