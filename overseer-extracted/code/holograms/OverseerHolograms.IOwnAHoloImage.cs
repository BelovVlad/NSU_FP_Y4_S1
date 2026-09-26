namespace OverseerHolograms;

public interface IOwnAHoloImage
{
	int CurrImageIndex { get; }

	int ShowTime { get; }

	OverseerImage.ImageID CurrImage { get; }

	float ImmediatelyToContent { get; }
}
