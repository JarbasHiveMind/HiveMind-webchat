from setuptools import setup

setup(
    name='hivemind_webchat',
    version='0.2.2',
    packages=['hivemind_webchat'],
    include_package_data=True,
    install_requires=["tornado"],
    url='https://github.com/JarbasHiveMind/HiveMind-webchat',
    license='Apache-2.0',
    author='jarbasAI',
    author_email='jarbasai@mailfence.com',
    description='local hivemind webchat',
    entry_points={
        'console_scripts': [
            'HiveMind-webchat=hivemind_webchat.__main__:main'
        ]
    }
)
