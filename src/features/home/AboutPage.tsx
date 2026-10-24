import { onMount } from 'solid-js';
import { useRootMeta } from '@shared/meta/page-meta';
import { IoBeerOutline } from 'solid-icons/io';
import Card from '@shared/ui/Card';
import './about.scss';

const About = () => {
    const { setTitle, setDescription } = useRootMeta();

    onMount(() => {
        setTitle('About · EchoPhase');
        setDescription('Learn more about EchoPhase and its architecture');
    });

    return (
        <div class="about">
            <h1>About Page</h1>
            <Card patterned class="about-card">
                <IoBeerOutline class="about-icon" />
            </Card>
        </div>
    );
};

export default About;
